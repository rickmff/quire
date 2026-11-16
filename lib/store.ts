"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CatalogComponent, SyncedLibrary } from "@/lib/catalog/schema";
import { techFrom, triggersFor } from "@/lib/motion";
import { classify, typeById } from "@/lib/types";

export type Bookmark = {
  id: string;
  url: string;
  title: string;
  description?: string;
  image?: string;
  video?: string;
  library: string;
  install?: string;
  tags: string[];
  note?: string;
  type?: string;
  category?: string;
  registry?: string;
  dependencies?: string[];
  ref?: string;
  collectionId: string | null;
  createdAt: number;
};

export type Collection = { id: string; name: string; createdAt: number };

export type Library = {
  version: 1;
  bookmarks: Bookmark[];
  collections: Collection[];
  mode?: "curated" | "scratch";
  sources?: string[];
  siteOrder?: string[];
  syncKey?: string;
  syncedAt?: number;
};

const KEY = "quire:v1";
const EMPTY: Library = { version: 1, bookmarks: [], collections: [] };

export const uid = () =>
  Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

export function readLibrary(): Library {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Library;
    if (!Array.isArray(parsed.bookmarks) || !Array.isArray(parsed.collections)) return EMPTY;
    return parsed;
  } catch {
    return EMPTY;
  }
}

export function writeLibrary(lib: Library) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lib));
  } catch {}
}

export type Meta = Omit<Bookmark, "id" | "collectionId" | "createdAt" | "note" | "type" | "category" | "registry" | "dependencies" | "ref" | "video">;

export async function fetchMeta(url: string): Promise<Meta> {
  const res = await fetch(`/api/meta?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error("Could not read that link");
  return res.json();
}

export function normalizeUrl(input: string): string | null {
  const s = input.trim();
  if (!s || /\s/.test(s)) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    if (!u.hostname.includes(".")) return null;
    u.hash = "";
    return u.href;
  } catch {
    return null;
  }
}

export function useLibrary() {
  const [lib, setLib] = useState<Library>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLib(readLibrary());
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setLib(readLibrary());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((fn: (l: Library) => Library) => {
    setLib((prev) => {
      const next = fn(prev);
      writeLibrary(next);
      return next;
    });
  }, []);

  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!ready || !lib.syncKey) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      pushLibrary(lib).then((ok) => ok && writeLibrary({ ...readLibrary(), syncedAt: Date.now() }));
    }, 1200);
    return () => window.clearTimeout(timer.current);
  }, [ready, lib.syncKey, lib.bookmarks, lib.sources, lib.mode]);

  return { lib, ready, update };
}

export const typeOf = (b: Bookmark) => b.type ?? classify({ title: b.title, description: b.description });

export function selectView(lib: Library, view: string | null) {
  if (view === "all") return { name: "All bookmarks", items: lib.bookmarks };
  if (view === null) return { name: "Inbox", items: lib.bookmarks.filter((b) => b.collectionId === null) };
  if (view.startsWith("type:")) {
    const id = view.slice(5);
    return { name: typeById(id).name, items: lib.bookmarks.filter((b) => typeOf(b) === id) };
  }
  return {
    name: lib.collections.find((c) => c.id === view)?.name ?? "Collection",
    items: lib.bookmarks.filter((b) => b.collectionId === view),
  };
}

export function exportMarkdown(lib: Library, view: string | null) {
  const { name, items } = selectView(lib, view);
  const lines = [
    `# ${name}`,
    "",
    "UI components saved with quire. Use these as the building blocks for the UI.",
    "Install each one with its command when present; otherwise open the source link and follow its docs.",
    "",
  ];
  for (const b of items) {
    lines.push(`## ${b.title}`);
    lines.push(`- Type: ${typeById(typeOf(b)).name}`);
    lines.push(`- Source: ${b.url}`);
    lines.push(`- Library: ${b.library}`);
    if (b.install) lines.push(`- Install: \`${b.install}\``);
    if (b.registry) lines.push(`- Registry: ${b.registry}`);
    if (b.dependencies?.length) lines.push(`- Dependencies: ${b.dependencies.join(", ")}`);
    if (b.tags.length) lines.push(`- Tags: ${b.tags.join(", ")}`);
    if (b.note) lines.push(`- Note: ${b.note}`);
    if (b.description) lines.push(`- About: ${b.description}`);
    lines.push("");
  }
  return lines.join("\n");
}

export function exportJSON(lib: Library, view: string | null) {
  const { name, items } = selectView(lib, view);
  return JSON.stringify(
    {
      collection: name,
      components: items.map((b) => ({
        title: b.title,
        type: typeById(typeOf(b)).name,
        url: b.url,
        library: b.library,
        ...(b.install ? { install: b.install } : {}),
        ...(b.registry ? { registry: b.registry } : {}),
        ...(b.dependencies?.length ? { dependencies: b.dependencies } : {}),
        ...(b.tags.length ? { tags: b.tags } : {}),
        ...(b.note ? { note: b.note } : {}),
        ...(b.description ? { description: b.description } : {}),
      })),
    },
    null,
    2,
  );
}

export function toComponent(b: Bookmark): CatalogComponent {
  const text = { title: b.title, description: b.description, category: b.category };
  return {
    id: b.ref ?? `mine/${b.id}`,
    library: b.ref?.split("/")[0] ?? "mine",
    name: b.title,
    title: b.title,
    description: b.description,
    category: b.category,
    type: typeOf(b),
    triggers: triggersFor(text),
    tech: techFrom(b.dependencies),
    dependencies: b.dependencies,
    docs: b.url,
    item: b.registry && /^https:\/\//.test(b.registry) ? b.registry : undefined,
    install: b.install,
    preview: b.image,
    video: b.video,
    note: b.note,
    site: b.library,
  };
}

export function toSynced(lib: Library): SyncedLibrary {
  return {
    version: 1,
    mode: lib.mode ?? "curated",
    sources: lib.sources ?? [],
    items: lib.bookmarks.map(toComponent),
    updatedAt: Date.now(),
  };
}

export async function pushLibrary(lib: Library) {
  if (!lib.syncKey) return false;
  try {
    const r = await fetch(`/api/library/${lib.syncKey}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(toSynced(lib)),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export function newSyncKey() {
  const a = new Uint8Array(20);
  crypto.getRandomValues(a);
  return [...a].map((x) => (x % 36).toString(36)).join("") + Date.now().toString(36);
}
