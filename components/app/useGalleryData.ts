"use client";

import { useMemo } from "react";
import { type Library, selectView, toComponent } from "@/lib/store";
import { typeById } from "@/lib/types";
import type { ClientCatalog, GalleryItem } from "@/lib/useCatalog";
import { groupItems, mix } from "@/lib/groups";
import { type View, groupView, siteKey, siteView, typeView } from "@/lib/view";

export type SiteSection = { key: string; name: string; items: GalleryItem[] };

const pageOf = (url: string) =>
  url
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/[#?].*$/, "")
    .replace(/\/$/, "")
    .toLowerCase();

const matchesAll = (haystack: string, words: string[]) => words.every((w) => haystack.includes(w));

export function useGalleryData({
  lib,
  catalog,
  view,
  words,
  libFilter,
}: {
  lib: Library;
  catalog: ClientCatalog | null;
  view: View;
  words: string[];
  libFilter: string | null;
}) {
  const fresh = !lib.mode && lib.bookmarks.length === 0;

  const followed = useMemo(() => {
    if (lib.sources) return new Set(lib.sources);
    return new Set((lib.mode === "curated" || fresh) && catalog ? catalog.libraries.map((l) => l.id) : []);
  }, [lib.sources, lib.mode, fresh, catalog]);

  const byDocs = useMemo(
    () => new Map((catalog?.components ?? []).map((c) => [c.docs.replace(/\/$/, ""), c])),
    [catalog],
  );

  const galleryItems = useMemo<GalleryItem[]>(() => {
    const saved = lib.bookmarks.map((b) => {
      const c = toComponent(b);
      const hit = b.ref ? catalog?.components.find((x) => x.id === b.ref) : undefined;
      return { ...(hit ?? c), note: b.note, saved: b.id, source: hit?.source ?? Boolean(c.item) };
    });
    const ids = new Set<string>();
    const pages = new Set<string>();
    const unique = saved.filter((s) => {
      const p = pageOf(s.docs);
      if (ids.has(s.id) || pages.has(p)) return false;
      ids.add(s.id);
      pages.add(p);
      return true;
    });
    const curated = (catalog?.components ?? []).filter(
      (c) => c.preview && followed.has(c.library) && !ids.has(c.id) && !pages.has(pageOf(c.docs)),
    );
    return [...unique, ...mix(curated)];
  }, [lib.bookmarks, catalog, followed]);

  const galleryView = useMemo(() => {
    const t = typeView(view);
    const s = siteView(view);
    const g = groupView(view);
    const inView =
      s && g
        ? (groupItems(galleryItems.filter((i) => siteKey(i) === s)).find((x) => x.key === g)?.items ?? [])
        : s
          ? galleryItems.filter((i) => siteKey(i) === s)
          : t
            ? galleryItems.filter((i) => i.type === t)
            : view === "libraries"
              ? groupItems(galleryItems).flatMap((g) => g.items)
              : galleryItems.filter((i) => i.saved);
    if (!words.length) return inView;
    return inView.filter((i) =>
      matchesAll(
        `${i.title} ${i.name} ${i.description ?? ""} ${i.category ?? ""} ${i.site ?? i.library} ${typeById(i.type).name} ${i.tech.join(" ")}`.toLowerCase(),
        words,
      ),
    );
  }, [galleryItems, view, words]);

  const sites = useMemo<SiteSection[]>(() => {
    const m = new Map<string, SiteSection>();
    for (const i of galleryItems) {
      const key = siteKey(i);
      if (!m.has(key))
        m.set(key, {
          key,
          name: i.site ?? catalog?.libraries.find((l) => l.id === i.library)?.name ?? i.library,
          items: [],
        });
      m.get(key)!.items.push(i);
    }
    const rank = new Map((lib.siteOrder ?? []).map((k, i) => [k, i]));
    const at = (k: string) => rank.get(k) ?? Infinity;
    return [...m.values()].sort((a, b) => at(a.key) - at(b.key) || a.name.localeCompare(b.name));
  }, [galleryItems, catalog, lib.siteOrder]);

  const starredSites = useMemo(
    () => sites.map((x) => ({ ...x, items: x.items.filter((i) => i.saved) })).filter((x) => x.items.length),
    [sites],
  );

  const bookmarksInView = useMemo(() => {
    const inView = selectView(lib, view).items.filter((b) => !libFilter || b.library === libFilter);
    if (!words.length) return inView;
    return inView.filter((b) =>
      matchesAll(`${b.title} ${b.url} ${b.library} ${b.description ?? ""} ${b.note ?? ""}`.toLowerCase(), words),
    );
  }, [lib, view, libFilter, words]);

  const importedSites = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of lib.bookmarks) if (!b.ref) m.set(b.library, (m.get(b.library) ?? 0) + 1);
    return [...m].filter(([, n]) => n > 1).map(([name, count]) => ({ name, count }));
  }, [lib.bookmarks]);

  const savedLibraries = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of lib.bookmarks) m.set(b.library, (m.get(b.library) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [lib.bookmarks]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const b of lib.bookmarks) {
      const k = b.collectionId ?? "inbox";
      c[k] = (c[k] ?? 0) + 1;
    }
    for (const i of galleryItems) {
      const t = `type:${i.type}`;
      c[t] = (c[t] ?? 0) + 1;
    }
    c.starred = galleryItems.filter((i) => i.saved).length;
    return c;
  }, [lib.bookmarks, galleryItems]);

  return {
    fresh,
    followed,
    byDocs,
    galleryItems,
    galleryView,
    sites,
    starredSites,
    bookmarksInView,
    importedSites,
    savedLibraries,
    counts,
  };
}
