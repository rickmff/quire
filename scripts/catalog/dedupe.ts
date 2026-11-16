import type { CatalogComponent } from "../../lib/catalog/schema.ts";

const strip: Record<string, (name: string) => string> = {
  "animate-ui": (n) => n.replace(/^(components|primitives)-/, "").replace(/^(radix|base|headless|animate)-/, ""),
  hextaui: (n) => n.replace(/^ui-sdk-/, ""),
};

function rank(c: CatalogComponent) {
  const n = c.name;
  let r = n.length / 100;
  if (/^primitives-/.test(n)) r += 10;
  if (/-(base|headless)-|^components-(base|headless)-/.test(n)) r += 2;
  if (/^ui-sdk-/.test(n)) r += 5;
  if (!c.preview) r += 1;
  return r;
}

export function dedupe(items: CatalogComponent[]) {
  const groups = new Map<string, CatalogComponent[]>();
  for (const c of items) {
    const key = `${c.library}|${(strip[c.library] ?? ((n: string) => n))(c.name)}|${c.title.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  const kept = [...groups.values()].map((g) => {
    const best = [...g].sort((a, b) => rank(a) - rank(b))[0];
    const pic = g.find((x) => x.preview);
    return !best.preview && pic ? { ...best, preview: pic.preview, ...(pic.video ? { video: pic.video } : {}) } : best;
  });
  const seen = new Map<string, CatalogComponent>();
  const out: CatalogComponent[] = [];
  for (const c of kept.sort((a, b) => rank(a) - rank(b))) {
    const k = c.preview && `${c.library}|${c.type}|${c.preview}`;
    if (k && seen.has(k)) continue;
    if (k) seen.set(k, c);
    out.push(c);
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}
