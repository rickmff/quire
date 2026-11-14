"use client";

import { useCallback, useEffect, useState } from "react";
import { classify, typeById } from "@/lib/types";

export type Bookmark = {
  id: string;
  url: string;
  title: string;
  description?: string;
  image?: string;
  library: string;
  install?: string;
  tags: string[];
  note?: string;
  // Component type from lib/types.ts. Older cards have none and are
  // classified on the fly from their title and description.
  type?: string;
  // The site's own category, e.g. "Inputs" on rareui.com.
  category?: string;
  // Pointer to the source in a shadcn registry, e.g. owner/repo/otp-input.
  registry?: string;
  dependencies?: string[];
  collectionId: string | null;
  createdAt: number;
};

export type Collection = { id: string; name: string; createdAt: number };

export type Library = {
  version: 1;
  bookmarks: Bookmark[];
  collections: Collection[];
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

export type Meta = Omit<Bookmark, "id" | "collectionId" | "createdAt" | "note" | "type" | "category" | "registry" | "dependencies">;

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

  return { lib, ready, update };
}

export const typeOf = (b: Bookmark) => b.type ?? classify({ title: b.title, description: b.description });

// A view is "all", null (Inbox), "type:<id>" or a collection id.
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
