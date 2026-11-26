import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { classify } from "../lib/types.ts";
import { techFrom, triggersFor } from "../lib/motion.ts";
import { SOURCES, type Source } from "./catalog/sources.ts";
import { dedupe } from "./catalog/dedupe.ts";
import { checkout } from "./catalog/git.ts";
import type { CatalogComponent, CatalogLibrary, Catalog } from "../lib/catalog/schema.ts";
import type { Registry, RegistryItem } from "../lib/catalog/registry.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const OUT = join(ROOT, "lib/catalog/data.json");
const manual: Record<string, RegistryItem[]> = JSON.parse(
  readFileSync(join(ROOT, "scripts/catalog/manual.json"), "utf8"),
);

const COMPONENT_TYPES = new Set(["registry:ui", "registry:component", "registry:block", undefined]);
const SKIP = /^(index|utils?|style|theme|demo|example)$|-(demo|example)(-\d+)?$/i;

const titleCase = (s: string) =>
  s
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b(Ui|Ai|Otp|Toc|Faq|Cta|Css|Svg|Gl|3d)\b/g, (w) => w.toUpperCase());

function frontMatter(text: string) {
  const m = text.match(/^---\s*\n([\s\S]*?)\n---/);
  const out: Record<string, string> = {};
  if (!m) return out;
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].replace(/^["']|["']$/g, "").trim();
  }
  return out;
}

const filePaths = (i: RegistryItem) =>
  (i.files ?? []).map((f) => (typeof f === "string" ? f : f.path)).filter((p): p is string => Boolean(p));
const fileTargets = (i: RegistryItem) =>
  (i.files ?? []).map((f) => (typeof f === "string" ? undefined : f.target?.replace(/^~\//, "")));

const registryEntry = (i: RegistryItem) => ({ ...i, files: filePaths(i) });

function entry(
  src: Source,
  raw: {
    name: string;
    title?: string;
    description?: string;
    category?: string;
    type?: string;
    dependencies?: string[];
    files?: string[];
  },
): CatalogComponent {
  const deps = (raw.dependencies ?? []).map((d) => d.replace(/(?<=.)@[^/]*$/, ""));
  const partial = src.fullTitles && /^\S+$/.test(raw.title ?? "") && raw.name.includes("-");
  let title = raw.title && !partial && !/^[a-z0-9-]+$/.test(raw.title) ? raw.title : titleCase(raw.name);
  if (/^[A-Z][a-z]+[A-Z][A-Za-z0-9]*$/.test(title)) title = title.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  const text = { title, name: raw.name, category: raw.category, description: raw.description };
  return {
    id: `${src.id}/${raw.name}`,
    library: src.id,
    name: raw.name,
    title,
    description: raw.description?.trim() || undefined,
    category: raw.category,
    type: classify(text),
    triggers: triggersFor(text),
    tech: techFrom(deps),
    dependencies: deps.length ? deps : undefined,
    docs: src.docs(raw.name, raw.category, raw.type),
    item: src.item?.(raw.name),
    install: src.install?.(raw.name),
    repo: src.repo,
    files: raw.files?.length ? raw.files : undefined,
  };
}

function reactBitsCategories(show: (p: string) => string) {
  const map = new Map<string, string>();
  try {
    const js = show("src/constants/Categories.js");
    for (const block of js.matchAll(/name:\s*'([^']+)',\s*subcategories:\s*\[([\s\S]*?)\]/g)) {
      for (const sub of block[2].matchAll(/'([^']+)'/g)) map.set(sub[1].replace(/\s+/g, "").toLowerCase(), block[1]);
    }
  } catch {}
  return map;
}

const MEDIA_DIR = /(^|\/)(og|covers?|previews?|thumbs?|thumbnails|screenshots?|posters?)(\/|$)/i;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function mediaIndex(files: string[]) {
  const idx = new Map<string, string[]>();
  for (const f of files) {
    if (!/\.(webp|png|jpe?g|gif|mp4|webm)$/i.test(f) || !MEDIA_DIR.test(f) || /\/blog\//.test(f)) continue;
    const base = f
      .split("/")
      .pop()!
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[-_.](dark|light|poster|preview|thumb)$/i, "");
    const k = norm(base);
    idx.set(k, [...(idx.get(k) ?? []), f]);
  }
  return idx;
}

function findMedia(idx: Map<string, string[]>, name: string, category?: string) {
  const keys = [name, name.replace(/^(components|primitives)-[a-z]+-/, ""), name.replace(/^[a-z]+-/, "")].map(norm);
  for (const k of keys) {
    let list = idx.get(k);
    if (!list) continue;
    if (category && list.length > 1) {
      const inCat = list.filter(
        (f) => f.toLowerCase().includes(norm(category).slice(0, 6)) || f.toLowerCase().includes(category.toLowerCase()),
      );
      if (inCat.length) list = inCat;
    }
    const pick = (re: RegExp) =>
      list!
        .filter((f) => re.test(f))
        .sort((a, b) => Number(/dark/i.test(b)) - Number(/dark/i.test(a)) || a.length - b.length)[0];
    return { image: pick(/\.(webp|png|jpe?g|gif)$/i), video: pick(/\.(mp4|webm)$/i) };
  }
  return {};
}

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

async function build(src: Source): Promise<CatalogComponent[]> {
  if (src.kind === "manual") {
    if (src.live) {
      const live = await fetchJSON<Registry>(src.live);
      if (live?.items?.length) {
        return live.items
          .filter((i) => COMPONENT_TYPES.has(i.type) && !SKIP.test(i.name))
          .map((i) => entry(src, registryEntry(i)));
      }
    }
    return (manual[src.id] ?? []).map((i) => entry(src, registryEntry(i)));
  }

  const { files, show } = checkout(src.repo!, src.branch);
  const fileSet = new Set(files);
  const resolve = (p: string, hint?: RegExp) => {
    const clean = p.replace(/^\.?\//, "");
    if (fileSet.has(clean)) return clean;
    const all = files.filter((f) => f.endsWith("/" + clean));
    return (hint && all.find((f) => hint.test(f))) ?? all[0];
  };
  const media = mediaIndex(files);
  const cdn = (path: string) => `https://cdn.jsdelivr.net/gh/${src.repo}@${src.branch ?? "main"}/${path}`;
  const withPreview = (c: CatalogComponent, base: string) => {
    const m = findMedia(media, base, c.category);
    if (m.image) c.preview = cdn(m.image);
    if (m.video) c.video = cdn(m.video);
    return c;
  };

  if (src.kind === "registry") {
    const reg: Registry | RegistryItem[] = JSON.parse(
      src.registry ? readFileSync(join(ROOT, src.registry), "utf8") : show(src.path!),
    );
    const items: RegistryItem[] = Array.isArray(reg) ? reg : (reg.items ?? []);
    const cats = src.id === "reactbits" ? reactBitsCategories(show) : null;
    const picked = new Map<string, RegistryItem>();
    const rank = (n: string) => {
      const i = (src.prefer ?? []).findIndex((suf) => n.endsWith(suf));
      return i < 0 ? 99 : i;
    };
    for (const i of items) {
      if (!COMPONENT_TYPES.has(i.type) || SKIP.test(i.name) || src.skip?.test(i.name) || i.access === "pro") continue;
      const base = src.variant ? i.name.replace(src.variant, "") : i.name;
      const prev = picked.get(base);
      if (!prev || rank(i.name) < rank(prev.name)) picked.set(base, i);
    }
    const out: CatalogComponent[] = [];
    for (const [base, i] of picked) {
      const paths = filePaths(i);
      const targets = fileTargets(i);
      const category = cats?.get(base.toLowerCase()) ?? i.category ?? i.categories?.find((c: string) => c !== src.id);
      const c = entry(src, {
        name: i.name,
        title: i.title ?? (src.variant ? titleCase(base) : undefined),
        description: i.description,
        category,
        type: i.type,
        dependencies: i.dependencies,
        files: paths
          .map((p, n) => resolve(p, src.pathHint?.(i.name)) ?? (targets[n] && resolve(targets[n]!)))
          .filter((p): p is string => Boolean(p)),
      });
      if (src.variant) c.docs = src.docs(base, category);
      out.push(withPreview(c, base));
    }
    return out;
  }

  const out: CatalogComponent[] = [];
  for (const f of files) {
    const m = f.match(src.pattern!);
    if (!m) continue;
    const [, category, name] = m;
    if (name === "index" || name === "page") continue;
    let fm: Record<string, string> = {};
    if (src.kind === "mdx") {
      try {
        fm = frontMatter(show(f));
      } catch {}
    }
    const code = (src.code?.(name, category) ?? []).filter((p) => fileSet.has(p));
    out.push(
      withPreview(entry(src, { name, title: fm.title, description: fm.description, category, files: code }), name),
    );
  }
  return out;
}

const only = process.argv.slice(2);
const prev: Catalog | null = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : null;
const libraries: CatalogLibrary[] = [];
let components: CatalogComponent[] = [];

for (const src of SOURCES) {
  if (only.length && !only.includes(src.id)) {
    const kept = prev?.components.filter((c) => c.library === src.id) ?? [];
    components.push(...kept);
    const lib = prev?.libraries.find((l) => l.id === src.id);
    if (lib) libraries.push(lib);
    continue;
  }
  try {
    const items = await build(src);
    if (src.docsPages && src.repo) {
      const { dir, base } = src.docsPages;
      const pages = checkout(src.repo, src.branch).files.filter((f) => f.startsWith(dir) && f.endsWith(".mdx"));
      for (const c of items) {
        const hit = pages.find((f) => f.endsWith(`/${c.name}.mdx`));
        if (hit) c.docs = base + hit.slice(dir.length, -4);
      }
    }
    components.push(...items);
    libraries.push({ id: src.id, name: src.name, url: src.url, blurb: src.blurb, repo: src.repo, count: items.length });
    console.log(`${src.id.padEnd(18)} ${items.length}`);
  } catch (e) {
    console.error(`${src.id}: ${(e as Error).message.split("\n")[0]}`);
  }
}

const STAGE = join(ROOT, "lib/catalog/stage.json");
if (existsSync(STAGE)) {
  type Shot = {
    image?: string;
    video?: string;
    live?: CatalogComponent["live"];
  };
  const shots: Record<string, Shot> = JSON.parse(readFileSync(STAGE, "utf8"));
  for (const c of components) {
    const s = shots[c.id];
    if (!s?.image) continue;
    c.preview = s.image;
    c.video = s.video;
    c.live = s.live;
  }
}

const CAPTURES = join(ROOT, "lib/catalog/captures.json");
if (existsSync(CAPTURES)) {
  const shots: Record<string, { image?: string; video?: string }> = JSON.parse(readFileSync(CAPTURES, "utf8"));
  for (const c of components) {
    const s = shots[c.id];
    if (!s) continue;
    if (!c.preview && s.image) c.preview = s.image;
    if (!c.video && s.video) c.video = s.video;
  }
}

components = dedupe(components);
for (const l of libraries) l.count = components.filter((c) => c.library === l.id).length;
const catalog: Catalog = { version: 1, generatedAt: new Date().toISOString().slice(0, 10), libraries, components };
mkdirSync(join(ROOT, "lib/catalog"), { recursive: true });
writeFileSync(OUT, JSON.stringify(catalog));
console.log(`\n${libraries.length} libraries, ${components.length} components -> lib/catalog/data.json`);
