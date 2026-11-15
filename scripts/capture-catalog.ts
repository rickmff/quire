// Records a preview for every catalog component that has none, using the
// capture service on your VPS (capture/). Results go to lib/catalog/captures.json;
// run build-catalog.ts afterwards (or now, with --apply) to merge them.
//
//   QUIRE_CAPTURE_URL=https://capture.example.com QUIRE_CAPTURE_TOKEN=... \
//     node scripts/capture-catalog.ts [--library magicui] [--limit 50] [--apply]

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Catalog } from "../lib/catalog/schema.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const DATA = join(ROOT, "lib/catalog/data.json");
const OUT = join(ROOT, "lib/catalog/captures.json");
const { QUIRE_CAPTURE_URL: base, QUIRE_CAPTURE_TOKEN: token } = process.env;
if (!base || !token) throw new Error("Set QUIRE_CAPTURE_URL and QUIRE_CAPTURE_TOKEN");

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const only = arg("library");
const limit = Number(arg("limit") ?? Infinity);
const parallel = Number(arg("parallel") ?? 2);

const catalog: Catalog = JSON.parse(readFileSync(DATA, "utf8"));
const shots: Record<string, { image?: string; video?: string }> = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const todo = catalog.components.filter((c) => !c.preview && !shots[c.id] && (!only || c.library === only)).slice(0, limit);
console.log(`${todo.length} to capture`);

let done = 0;
async function worker() {
  while (todo.length) {
    const c = todo.shift()!;
    try {
      const r = await fetch(`${base!.replace(/\/$/, "")}/capture`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ url: c.docs, video: true }),
        signal: AbortSignal.timeout(90_000),
      });
      if (r.ok) shots[c.id] = await r.json();
      else console.warn(`${c.id}: ${r.status}`);
    } catch (e) {
      console.warn(`${c.id}: ${(e as Error).message}`);
    }
    if (++done % 10 === 0) {
      writeFileSync(OUT, JSON.stringify(shots, null, 1));
      console.log(`${done} done`);
    }
  }
}
await Promise.all(Array.from({ length: parallel }, worker));
writeFileSync(OUT, JSON.stringify(shots, null, 1));

if (process.argv.includes("--apply")) {
  for (const c of catalog.components) {
    const s = shots[c.id];
    if (s && !c.preview) Object.assign(c, { preview: s.image, ...(s.video ? { video: s.video } : {}) });
  }
  writeFileSync(DATA, JSON.stringify(catalog));
}
console.log(`saved ${Object.keys(shots).length} captures to lib/catalog/captures.json`);
