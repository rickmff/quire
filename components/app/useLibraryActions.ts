"use client";

import type { ImportChoice } from "@/components/ImportDialog";
import type { Flash } from "@/components/app/useToast";
import { agentText } from "@/lib/agentText";
import { matchLibrary, titleFromUrl } from "@/lib/libraries";
import {
  type Bookmark,
  type Library,
  fetchMeta,
  newSyncKey,
  normalizeUrl,
  pushLibrary,
  toComponent,
  uid,
} from "@/lib/store";
import { typeById } from "@/lib/types";
import { type ClientCatalog, type GalleryItem, getStatus } from "@/lib/useCatalog";
import { type View, typeView } from "@/lib/view";

type Update = (fn: (l: Library) => Library) => void;

const trimSlash = (url: string) => url.replace(/\/$/, "");

export function useLibraryActions({
  lib,
  update,
  catalog,
  byDocs,
  followed,
  galleryItems,
  view,
  setView,
  flash,
  dismissToast,
}: {
  lib: Library;
  update: Update;
  catalog: ClientCatalog | null;
  byDocs: Map<string, GalleryItem>;
  followed: Set<string>;
  galleryItems: GalleryItem[];
  view: View;
  setView: (v: View) => void;
  flash: Flash;
  dismissToast: () => void;
}) {
  const libraryName = (id: string) => catalog?.libraries.find((x) => x.id === id)?.name ?? id;

  const capturePreviews = async (urls: string[]) => {
    if (!(await getStatus()).capture) return;
    for (const url of urls) {
      try {
        const r = await fetch("/api/capture", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!r.ok) continue;
        const { image, video } = await r.json();
        update((l) => ({
          ...l,
          bookmarks: l.bookmarks.map((b) => (b.url === url && !b.image ? { ...b, image, video } : b)),
        }));
      } catch {}
    }
  };

  const removeBookmark = (id: string) => {
    const idx = lib.bookmarks.findIndex((x) => x.id === id);
    const gone = lib.bookmarks[idx];
    if (!gone) return;
    update((l) => ({ ...l, bookmarks: l.bookmarks.filter((x) => x.id !== id) }));
    flash("Removed from Starred", () => {
      update((l) => {
        if (l.bookmarks.some((x) => x.id === gone.id)) return l;
        const next = [...l.bookmarks];
        next.splice(Math.min(idx, next.length), 0, gone);
        return { ...l, bookmarks: next };
      });
      dismissToast();
    });
  };

  const saveFromCatalog = (c: GalleryItem) => {
    if (lib.bookmarks.some((b) => b.ref === c.id || b.url === c.docs)) return flash("Already saved");
    update((l) => ({
      ...l,
      bookmarks: [
        {
          id: uid(),
          url: c.docs,
          title: c.title,
          description: c.description,
          image: c.preview,
          library: libraryName(c.library),
          install: c.install,
          registry: c.item,
          category: c.category,
          type: c.type,
          ref: c.id,
          tags: [],
          collectionId: null,
          createdAt: Date.now(),
        },
        ...l.bookmarks,
      ],
    }));
    flash("Starred");
  };

  const toggleStar = (c: GalleryItem) => {
    const id = lib.bookmarks.find((b) => b.id === c.saved || b.ref === c.id || b.url === c.docs)?.id;
    if (id) removeBookmark(id);
    else saveFromCatalog(c);
  };

  const setFollowed = (next: Set<string>) => update((l) => ({ ...l, sources: [...next] }));

  const followCurated = (raw: string) => {
    const url = normalizeUrl(raw);
    if (!url || !catalog) return false;
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const site = catalog.libraries.find((l) => {
      const lu = new URL(l.url);
      return (
        lu.hostname.replace(/^www\./, "") === host &&
        (trimSlash(u.pathname) === trimSlash(lu.pathname) || /^\/(docs\/?)?(components\/?)?$/.test(u.pathname))
      );
    });
    if (!site) return false;
    if (!followed.has(site.id)) {
      setFollowed(new Set([...followed, site.id]));
      update((l) => ({ ...l, mode: l.mode ?? "scratch" }));
    }
    setView(`site:${site.id}`);
    flash(`${site.name}: ${site.count} components in your library`);
    return true;
  };

  const add = async (raw: string) => {
    const url = normalizeUrl(raw);
    if (!url) return flash("Not a link");
    if (lib.bookmarks.some((b) => b.url === url)) return flash("Already saved");
    const id = uid();
    const m = matchLibrary(url);
    const t = typeView(view);
    const known = byDocs.get(trimSlash(url));
    if (known) {
      saveFromCatalog(known);
      return;
    }
    if (followCurated(url)) return;
    const draft: Bookmark = {
      id,
      url,
      title: titleFromUrl(url),
      library: m.library,
      install: m.install,
      tags: [],
      ...(t ? { type: t } : {}),
      collectionId: !t && lib.collections.some((c) => c.id === view) ? view : null,
      createdAt: Date.now(),
    };
    update((l) => ({ ...l, bookmarks: [draft, ...l.bookmarks] }));
    flash("Starred");
    try {
      const meta = await fetchMeta(url);
      update((l) => ({
        ...l,
        bookmarks: l.bookmarks.map((b) =>
          b.id === id ? { ...b, ...meta, install: b.install ?? meta.install, url } : b,
        ),
      }));
      if (!meta.image) capturePreviews([url]);
    } catch {
      capturePreviews([url]);
    }
  };

  const importSite = ({ result, items, collection }: ImportChoice) => {
    let colId: string | null = null;
    update((l) => {
      let collections = l.collections;
      if (collection) {
        const existing = l.collections.find((c) => c.name === collection);
        colId = existing?.id ?? uid();
        if (!existing) collections = [...collections, { id: colId, name: collection, createdAt: Date.now() }];
      }
      const have = new Set(l.bookmarks.map((b) => b.url));
      const now = Date.now();
      const added: Bookmark[] = items
        .filter((i) => !have.has(i.url))
        .map((i, n) => ({
          id: uid(),
          ...(byDocs.get(trimSlash(i.url)) ? { ref: byDocs.get(trimSlash(i.url))!.id } : {}),
          url: i.url,
          title: i.title,
          description: i.description,
          library: result.library,
          install: i.install,
          registry: i.registry,
          dependencies: i.dependencies,
          category: i.category,
          type: i.type,
          tags: [],
          collectionId: colId,
          createdAt: now - n,
        }));
      return { ...l, collections, bookmarks: [...added, ...l.bookmarks] };
    });
    setView("starred");
    flash(`Imported ${items.length} from ${result.site}`);
    capturePreviews(items.map((i) => i.url));
  };

  const enableSync = async () => {
    const key = newSyncKey();
    const next = { ...lib, syncKey: key, sources: [...followed], mode: lib.mode ?? "curated" };
    const ok = await pushLibrary(next);
    if (!ok) return flash("Could not connect. Try again later.");
    update((l) => ({ ...l, syncKey: key, sources: next.sources, mode: next.mode, syncedAt: Date.now() }));
    flash("Library connected");
  };

  const syncNow = async () => flash((await pushLibrary(lib)) ? "Synced" : "Sync failed");

  const createCollection = (name: string) => {
    const n = name.trim();
    if (!n) return;
    const id = uid();
    update((l) => ({ ...l, collections: [...l.collections, { id, name: n, createdAt: Date.now() }] }));
    setView(id);
  };

  const renameCollection = (id: string, name: string) => {
    const n = name.trim();
    if (!n) return;
    update((l) => ({ ...l, collections: l.collections.map((c) => (c.id === id ? { ...c, name: n } : c)) }));
  };

  const deleteCollection = (id: string) => {
    const idx = lib.collections.findIndex((c) => c.id === id);
    const gone = lib.collections[idx];
    if (!gone) return;
    const members = new Set(lib.bookmarks.filter((b) => b.collectionId === id).map((b) => b.id));
    update((l) => ({
      ...l,
      collections: l.collections.filter((c) => c.id !== id),
      bookmarks: l.bookmarks.map((b) => (b.collectionId === id ? { ...b, collectionId: null } : b)),
    }));
    if (view === id) setView("starred");
    flash(`Removed “${gone.name}”`, () => {
      update((l) => {
        if (l.collections.some((c) => c.id === gone.id)) return l;
        const collections = [...l.collections];
        collections.splice(Math.min(idx, collections.length), 0, gone);
        return {
          ...l,
          collections,
          bookmarks: l.bookmarks.map((b) =>
            members.has(b.id) && b.collectionId === null ? { ...b, collectionId: gone.id } : b,
          ),
        };
      });
      dismissToast();
    });
  };

  const editBookmark = (bookmarkId: string, change: Partial<Bookmark>) =>
    update((l) => ({ ...l, bookmarks: l.bookmarks.map((b) => (b.id === bookmarkId ? { ...b, ...change } : b)) }));

  const moveTo = (bookmarkId: string, collectionId: string | null) => editBookmark(bookmarkId, { collectionId });
  const setType = (bookmarkId: string, type: string) => editBookmark(bookmarkId, { type });
  const setNote = (bookmarkId: string, note: string) => editBookmark(bookmarkId, { note });

  const moveAndSay = (bookmarkId: string, collectionId: string | null) => {
    moveTo(bookmarkId, collectionId);
    flash(`Moved to ${collectionId ? lib.collections.find((c) => c.id === collectionId)?.name : "no collection"}`);
  };

  const dropTo = (bookmarkId: string, target: View) => {
    const t = typeView(target);
    if (t) {
      setType(bookmarkId, t);
      flash(`Marked as ${typeById(t).name}`);
    } else moveTo(bookmarkId, target);
  };

  const copy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(msg);
    } catch {
      flash("Copy failed");
    }
  };

  const copyCommand = (b: Bookmark) => (b.install ? copy(b.install, "Command copied") : copy(b.url, "Link copied"));

  const itemFor = (b: Bookmark): GalleryItem => {
    const shown = galleryItems.find((i) => i.saved === b.id);
    if (shown) return shown;
    const c = toComponent(b);
    const hit = b.ref ? catalog?.components.find((x) => x.id === b.ref) : undefined;
    return { ...(hit ?? c), note: b.note, saved: b.id, source: hit?.source ?? Boolean(c.item) };
  };

  const copyForAgent = (b: Bookmark) => {
    const hit = b.ref ? catalog?.components.find((x) => x.id === b.ref) : undefined;
    const i = hit ?? toComponent(b);
    copy(agentText(i, i.site ?? libraryName(i.library)), "Copied for your agent");
  };

  const copyInstall = (bookmarks: Bookmark[]) => {
    const cmds = bookmarks
      .map((b) => b.install)
      .filter(Boolean)
      .join("\n");
    if (!cmds) return flash("No install commands here");
    copy(cmds, "Install commands copied");
  };

  return {
    add,
    removeBookmark,
    toggleStar,
    setFollowed,
    followCurated,
    importSite,
    enableSync,
    syncNow,
    createCollection,
    renameCollection,
    deleteCollection,
    moveTo,
    moveAndSay,
    setType,
    setNote,
    dropTo,
    copy,
    copyCommand,
    copyForAgent,
    copyInstall,
    itemFor,
  };
}
