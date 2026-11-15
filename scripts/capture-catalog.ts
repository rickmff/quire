// Records a preview for every catalog component that has none, with the
// capture service (capture/). It runs on your own machine by default.
//
//   1. cd capture && npm install && npx playwright install chromium && npm start
//   2. node scripts/capture-catalog.ts [--library magicui] [--limit 50] [--parallel 3] [--video] [--retry]
//
// Each still is saved into public/previews/<library>/<name>.webp, so it ships
// with the site and needs no server. lib/catalog/captures.json maps ids to
// those files, and build-catalog.ts merges it on every build. Pages that could
// not be captured go to lib/catalog/no-preview.json with the reason; the
// gallery leaves those out. --retry tries them again.
//
// Env (optional): QUIRE_CAPTURE_URL (default http://localhost:8080),
// QUIRE_CAPTURE_TOKEN (default: CAPTURE_TOKEN from capture/.env).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Catalog } from "../lib/catalog/schema.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DATA = join(ROOT, "lib/catalog/data.json");
const OUT = join(ROOT, "lib/catalog/captures.json");
const FAILED = join(ROOT, "lib/catalog/no-preview.json");
const PUBLIC = join(ROOT, "public");

function envToken() {
  try {
    return readFileSync(join(ROOT, "capture/.env"), "utf8").match(/^\s*CAPTURE_TOKEN\s*=\s*["']?([^"'\r\n]+)/m)?.[1];
  } catch {
    return undefined;
  }
}
const base = (process.env.QUIRE_CAPTURE_URL || "http://localhost:8080").replace(/\/$/, "");
const token = process.env.QUIRE_CAPTURE_TOKEN || envToken();
if (!token) throw new Error("Set QUIRE_CAPTURE_TOKEN, or CAPTURE_TOKEN in capture/.env");

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const flag = (name: string) => process.argv.includes(`--${name}`);
const only = arg("library");
const limit = Number(arg("limit") ?? Infinity);
const parallel = Number(arg("parallel") ?? 3);
const withVideo = flag("video");

const read = <T,>(file: string, empty: T): T => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : empty);
const catalog: Catalog = read(DATA, { version: 1, generatedAt: "", libraries: [], components: [] });
const shots = read<Record<string, { image?: string; video?: string }>>(OUT, {});
const failed = read<Record<string, string>>(FAILED, {});
if (flag("retry")) for (const id of Object.keys(failed)) delete failed[id];

const todo = catalog.components
  .filter((c) => !c.preview && !shots[c.id]?.image && !failed[c.id] && (!only || c.library === only))
  .slice(0, limit);
console.log(`${todo.length} to capture with ${base}`);

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "item";

// Copies a file the capture service made into public/, and returns its site path.
async function keep(url: string, path: string) {
  const r = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!r.ok) throw new Error(`download ${r.status}`);
  const file = join(PUBLIC, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  return `/${path}`;
}

const save = () => {
  writeFileSync(OUT, JSON.stringify(shots, null, 1));
  writeFileSync(FAILED, JSON.stringify(failed, null, 1));
};

let done = 0;
async function worker() {
  while (todo.length) {
    const c = todo.shift()!;
    const name = `previews/${slug(c.library)}/${slug(c.name)}`;
    try {
      const r = await fetch(`${base}/capture`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ url: c.docs, video: withVideo, width: 800 }),
        signal: AbortSignal.timeout(120_000),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.image) throw new Error(body.error || `capture ${r.status}`);
      shots[c.id] = {
        image: await keep(body.image, `${name}.webp`),
        ...(withVideo && body.video ? { video: await keep(body.video, `${name}.webm`).catch(() => undefined) } : {}),
      };
    } catch (e) {
      failed[c.id] = (e as Error).message.slice(0, 160);
      console.warn(`${c.id}: ${failed[c.id]}`);
    }
    if (++done % 10 === 0) {
      save();
      console.log(`${done} done`);
    }
  }
}
await Promise.all(Array.from({ length: parallel }, worker));
save();

// Merge into data.json now, so the site shows them without a full rebuild.
for (const c of catalog.components) {
  const s = shots[c.id];
  if (s?.image && !c.preview) c.preview = s.image;
  if (s?.video && !c.video) c.video = s.video;
}
writeFileSync(DATA, JSON.stringify(catalog));

const missing = catalog.components.filter((c) => !c.preview).length;
console.log(`${Object.keys(shots).length} captures saved. ${Object.keys(failed).length} failed (lib/catalog/no-preview.json). ${missing} components still without a preview.`);
