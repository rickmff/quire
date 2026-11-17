import { type Library } from "@/lib/store";

export function download(lib: Library) {
  const blob = new Blob([JSON.stringify(lib, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `quire-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
export function mergeLibrary(a: Library, b: Library): Library {
  if (!b || !Array.isArray(b.bookmarks)) return a;
  const urls = new Set(a.bookmarks.map((x) => x.url));
  const colIds = new Set(a.collections.map((c) => c.id));
  return {
    ...a,
    version: 1,
    collections: [...a.collections, ...(b.collections ?? []).filter((c) => !colIds.has(c.id))],
    bookmarks: [...b.bookmarks.filter((x) => !urls.has(x.url)), ...a.bookmarks],
  };
}
