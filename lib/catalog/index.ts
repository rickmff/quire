import data from "./data.json";
import type { Catalog, CatalogComponent, CatalogLibrary, SyncedLibrary } from "./schema";
import { TYPES, OTHER, typeById } from "../types";
import { TRIGGERS, triggerById } from "../motion";
import { ENGINES, engineById, engineName, engineOf, type EngineId } from "../engine";

const raw = data as unknown as Catalog;
export const catalog: Catalog = {
  ...raw,
  components: raw.components.map((c) => {
    const engine = c.engine ?? engineOf(c);
    return engine ? { ...c, engine } : c;
  }),
};
export const libraries: CatalogLibrary[] = catalog.libraries;
const libraryById = new Map(libraries.map((l) => [l.id, l]));
export const libraryName = (c: CatalogComponent) => c.site ?? libraryById.get(c.library)?.name ?? c.library;

export function scope(user: SyncedLibrary | null): CatalogComponent[] {
  if (!user) return catalog.components;
  const follow = new Set(user.sources);
  const own = new Set(user.items.map((i) => i.id));
  return [...user.items, ...catalog.components.filter((c) => follow.has(c.library) && !own.has(c.id))];
}

export type Query = {
  query?: string;
  type?: string;
  trigger?: string;
  tech?: string;
  library?: string;
  engine?: string;
  limit?: number;
};

const SYNONYMS: Record<string, string[]> = {
  button: ["btn", "cta"],
  modal: ["dialog", "popup"],
  navbar: ["nav", "header", "menu"],
  loader: ["spinner", "loading", "skeleton"],
  carousel: ["slider", "marquee", "gallery"],
  text: ["typography", "heading", "title", "word", "letters"],
  background: ["bg", "backdrop", "gradient", "pattern"],
  hover: ["mouseover", "mouse"],
  animated: ["animation", "animate", "motion"],
};

function terms(q: string) {
  const base = q
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
  const out = new Set(base);
  for (const t of base) {
    for (const [k, v] of Object.entries(SYNONYMS)) if (k === t || v.includes(t)) [k, ...v].forEach((x) => out.add(x));
  }
  return [...out];
}
const STOP = new Set(
  "a an the and or for with to of in on my me i want need make build some that this like page site ui component components".split(
    " ",
  ),
);

function haystack(c: CatalogComponent) {
  return {
    title: c.title.toLowerCase(),
    name: c.name.toLowerCase().replace(/[-_]/g, " "),
    meta: [c.category, typeById(c.type).name, ...c.triggers, ...c.tech, engineName(c.engine), libraryName(c)]
      .join(" ")
      .toLowerCase(),
    body: (c.description ?? "").toLowerCase() + " " + (c.note ?? "").toLowerCase(),
  };
}

export function score(c: CatalogComponent, ts: string[]) {
  if (!ts.length) return 1;
  const h = haystack(c);
  let s = 0;
  for (const t of ts) {
    if (h.title.includes(t)) s += 5;
    else if (h.name.includes(t)) s += 4;
    if (h.meta.includes(t)) s += 2;
    if (h.body.includes(t)) s += 1;
  }
  if (s && c.description) s += 0.5;
  if (s && (c.item || c.files)) s += 0.3;
  return s;
}

export function search(items: CatalogComponent[], q: Query) {
  const ts = terms(q.query ?? "");
  const lib = q.library?.toLowerCase();
  const engine = q.engine ? (engineById(q.engine) ?? q.engine) : undefined;
  const hits = items
    .filter((c) => !q.type || c.type === q.type)
    .filter((c) => !q.trigger || c.triggers.includes(q.trigger))
    .filter((c) => !q.tech || c.tech.some((t) => t.toLowerCase() === q.tech!.toLowerCase()))
    .filter((c) => !engine || c.engine === engine)
    .filter((c) => !lib || c.library === lib || libraryName(c).toLowerCase() === lib)
    .map((c) => ({ c, s: score(c, ts) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.c.title.localeCompare(b.c.title));
  return { total: hits.length, items: hits.slice(0, Math.min(q.limit ?? 12, 50)).map((x) => x.c) };
}

export function readBrief(brief: string) {
  const text = brief.replace(/[-_/]+/g, " ");
  const types = TYPES.filter((t) => t.re.test(text)).map((t) => t.id);
  const triggers = TRIGGERS.filter((t) => t.re.test(text)).map((t) => t.id);
  return { types: [...new Set(types)].slice(0, 6), triggers: [...new Set(triggers)].slice(0, 3) };
}

export function facets(items: CatalogComponent[]) {
  const count = (key: (c: CatalogComponent) => string[]) => {
    const m = new Map<string, number>();
    for (const c of items) for (const k of key(c)) m.set(k, (m.get(k) ?? 0) + 1);
    return m;
  };
  const types = count((c) => [c.type]);
  const trig = count((c) => c.triggers);
  const tech = count((c) => c.tech);
  const libs = count((c) => [c.library]);
  const engines = count((c) => (c.engine ? [c.engine] : []));
  return {
    types: [...TYPES, OTHER]
      .filter((t) => types.has(t.id))
      .map((t) => ({ id: t.id, name: t.name, family: t.family, count: types.get(t.id)! })),
    triggers: TRIGGERS.filter((t) => trig.has(t.id)).map((t) => ({ id: t.id, name: t.name, count: trig.get(t.id)! })),
    tech: [...tech].sort((a, b) => b[1] - a[1]).map(([id, count]) => ({ id, count })),
    engines: (Object.keys(ENGINES) as EngineId[])
      .filter((id) => engines.has(id))
      .map((id) => ({ id, name: ENGINES[id].name, count: engines.get(id)! })),
    libraries: [...libs]
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => ({ id, name: libraryById.get(id)?.name ?? id, count })),
  };
}

export { typeById, triggerById };
