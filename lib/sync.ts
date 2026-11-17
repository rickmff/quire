import "server-only";
import { kv } from "./kv";
import type { CatalogComponent, SyncedLibrary } from "./catalog/schema";
import { libraries } from "./catalog";

export const KEY_RE = /^[a-z0-9]{24,48}$/;
const MAX_BYTES = 1_500_000;
const store = (key: string) => `lib:${key}`;

export async function loadLibrary(key: string | null | undefined): Promise<SyncedLibrary | null> {
  if (!key || !KEY_RE.test(key)) return null;
  const db = kv();
  if (!db) return null;
  const raw = await db.get(store(key));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SyncedLibrary;
  } catch {
    return null;
  }
}

const s = (v: unknown, max = 300) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
const arr = (v: unknown, max = 20) =>
  Array.isArray(v)
    ? v
        .filter((x) => typeof x === "string")
        .slice(0, max)
        .map((x) => x.slice(0, 80))
    : [];
const url = (v: unknown) => {
  const x = s(v, 600);
  return x && /^https?:\/\//.test(x) ? x : undefined;
};

type Untrusted = Record<string, unknown>;

const isRecord = (v: unknown): v is Untrusted => typeof v === "object" && v !== null;

export function cleanLibrary(input: unknown): SyncedLibrary | null {
  if (!isRecord(input)) return null;
  const known = new Set(libraries.map((l) => l.id));
  const items: CatalogComponent[] = (Array.isArray(input.items) ? input.items : [])
    .slice(0, 5000)
    .flatMap((entry: unknown) => {
      const i: Untrusted = isRecord(entry) ? entry : {};
      const id = s(i.id, 120);
      const title = s(i.title, 160);
      const docs = url(i.docs);
      if (!id || !title || !docs) return [];
      return [
        {
          id,
          library: s(i.library, 80) ?? "mine",
          name: s(i.name, 120) ?? id,
          title,
          description: s(i.description, 600),
          category: s(i.category, 80),
          type: s(i.type, 40) ?? "other",
          triggers: arr(i.triggers, 4),
          tech: arr(i.tech, 6),
          dependencies: arr(i.dependencies, 30),
          docs,
          item: url(i.item),
          install: s(i.install, 300),
          repo: s(i.repo, 120),
          files: arr(i.files, 10),
          preview: url(i.preview),
          note: s(i.note, 1000),
          site: s(i.site, 80),
        },
      ];
    });
  return {
    version: 1,
    mode: input.mode === "scratch" ? "scratch" : "curated",
    sources: arr(input.sources, 200).filter((x) => known.has(x)),
    items,
    updatedAt: Date.now(),
  };
}

export async function saveLibrary(key: string, lib: SyncedLibrary) {
  const db = kv();
  if (!db) throw new Error("no-store");
  const body = JSON.stringify(lib);
  if (body.length > MAX_BYTES) throw new Error("too-large");
  await db.put(store(key), body);
}
