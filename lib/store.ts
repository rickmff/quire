"use client";

import { useCallback, useEffect, useState } from "react";

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

export type Meta = Omit<Bookmark, "id" | "collectionId" | "createdAt" | "note">;

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

export function exportMarkdown(lib: Library, collectionId: string | "all" | null) {
  const items =
    collectionId === "all"
      ? lib.bookmarks
      : lib.bookmarks.filter((b) => b.collectionId === collectionId);
  const name =
    collectionId === "all"
      ? "All bookmarks"
      : collectionId === null
        ? "Inbox"
        : (lib.collections.find((c) => c.id === collectionId)?.name ?? "Collection");
  const lines = [
    `# ${name}`,
    "",
    "UI components saved with quire. Use these as the building blocks for the UI.",
    "Install each one with its command when present; otherwise open the source link and follow its docs.",
    "",
  ];
  for (const b of items) {
    lines.push(`## ${b.title}`);
    lines.push(`- Source: ${b.url}`);
    lines.push(`- Library: ${b.library}`);
    if (b.install) lines.push(`- Install: \`${b.install}\``);
    if (b.tags.length) lines.push(`- Tags: ${b.tags.join(", ")}`);
    if (b.note) lines.push(`- Note: ${b.note}`);
    if (b.description) lines.push(`- About: ${b.description}`);
    lines.push("");
  }
  return lines.join("\n");
}
