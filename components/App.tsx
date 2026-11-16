"use client";

import { Command } from "cmdk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type Bookmark,
  type Library,
  exportMarkdown,
  exportJSON,
  fetchMeta,
  normalizeUrl,
  selectView,
  typeOf,
  uid,
  useLibrary,
} from "@/lib/store";
import { matchLibrary, titleFromUrl } from "@/lib/libraries";
import { OTHER, TYPES, typeById } from "@/lib/types";
import Wordmark from "@/components/Wordmark";
import ImportDialog, { type ImportChoice } from "@/components/ImportDialog";
import { Agents, Detail, Gallery, Onboarding, Sources } from "@/components/Gallery";
import { type GalleryItem, getStatus, useCatalog, useSyncAvailable } from "@/lib/useCatalog";
import { newSyncKey, pushLibrary, toComponent } from "@/lib/store";

// "library" = the whole reference gallery, "all" = saved cards,
// "type:<id>" = one component type across the library, "sites", "agents",
// else a collection id.
type View = "library" | "all" | null | string;

const typeView = (v: View) => (typeof v === "string" && v.startsWith("type:") ? v.slice(5) : null);
// "site:<key>" = one library and its own components.
const siteView = (v: View) => (typeof v === "string" && v.startsWith("site:") ? v.slice(5) : null);
const PAGES = new Set(["library", "sites", "agents"]);
const isGallery = (v: View) => v === "library" || typeView(v) !== null || siteView(v) !== null;
// Curated components group by library id; your own links by the site they came from.
const siteKey = (i: { library: string; site?: string }) =>
  i.library !== "mine" ? i.library : `mine-${(i.site ?? "mine").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

const EXAMPLES = [
  "magicui.design/docs/components/marquee",
  "ui.aceternity.com/components/3d-card-effect",
  "ui.shadcn.com/docs/components/command",
];

export default function App() {
  const { lib, ready, update } = useLibrary();
  const [view, setView] = useState<View>("library");
  const catalog = useCatalog();
  const syncOk = useSyncAvailable();
  const [open, setOpen] = useState<GalleryItem | null>(null);

  // Quire registers no service worker. One left on this origin by another app
  // (localhost:3000 is shared by many projects) can serve stale scripts, so drop it.
  useEffect(() => {
    navigator.serviceWorker
      ?.getRegistrations()
      .then((rs) => rs.forEach((r) => r.unregister()))
      .catch(() => {});
  }, []);
  const [input, setInput] = useState("");
  const [palette, setPalette] = useState(false);
  const [toast, setToast] = useState<{ msg: string; undo?: () => void } | null>(null);
  const [newCol, setNewCol] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  // The collection waiting for the user to confirm its removal.
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [libFilter, setLibFilter] = useState<string | null>(null);
  const [sel, setSel] = useState(-1);
  const [importing, setImporting] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const flash = useCallback((msg: string, undo?: () => void) => {
    setToast({ msg, undo });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), undo ? 4000 : 1600);
  }, []);

  const removeBookmark = (id: string) => {
    const idx = lib.bookmarks.findIndex((x) => x.id === id);
    const gone = lib.bookmarks[idx];
    if (!gone) return;
    update((l) => ({ ...l, bookmarks: l.bookmarks.filter((x) => x.id !== id) }));
    flash("Deleted", () => {
      update((l) => {
        if (l.bookmarks.some((x) => x.id === gone.id)) return l;
        const next = [...l.bookmarks];
        next.splice(Math.min(idx, next.length), 0, gone);
        return { ...l, bookmarks: next };
      });
      setToast(null);
    });
  };

  const add = useCallback(
    async (raw: string) => {
      const url = normalizeUrl(raw);
      if (!url) return flash("Not a link");
      if (lib.bookmarks.some((b) => b.url === url)) return flash("Already saved");
      const id = uid();
      const m = matchLibrary(url);
      const t = typeView(view);
      const known = byDocs.get(url.replace(/\/$/, ""));
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
        collectionId: view === "all" || t ? null : view,
        createdAt: Date.now(),
      };
      update((l) => ({ ...l, bookmarks: [draft, ...l.bookmarks] }));
      flash("Saved");
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lib.bookmarks, update, view, flash, catalog],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest("input, textarea, select");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === "Escape" && typing) {
        (e.target as HTMLElement).blur();
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea")) return;
      const text = e.clipboardData?.getData("text") ?? "";
      if (normalizeUrl(text)) {
        e.preventDefault();
        add(text);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("paste", onPaste);
    };
  }, [add]);

  // Sites the user follows from the curated catalog.
  const followed = useMemo(() => {
    if (lib.sources) return new Set(lib.sources);
    return new Set(lib.mode === "curated" && catalog ? catalog.libraries.map((l) => l.id) : []);
  }, [lib.sources, lib.mode, catalog]);

  const byDocs = useMemo(() => new Map((catalog?.components ?? []).map((c) => [c.docs.replace(/\/$/, ""), c])), [catalog]);

  const galleryItems = useMemo<GalleryItem[]>(() => {
    const saved = lib.bookmarks.map((b) => {
      const c = toComponent(b);
      const hit = b.ref ? catalog?.components.find((x) => x.id === b.ref) : undefined;
      return { ...(hit ?? c), note: b.note, saved: b.id, source: hit?.source ?? Boolean(c.item) };
    });
    // One card per component: a saved copy of a curated component (same id or
    // same page) replaces the curated card, and a page saved twice shows once.
    const page = (u: string) => u.replace(/^https?:\/\/(www\.)?/, "").replace(/[#?].*$/, "").replace(/\/$/, "").toLowerCase();
    const ids = new Set<string>();
    const pages = new Set<string>();
    const unique = saved.filter((s) => {
      const p = page(s.docs);
      if (ids.has(s.id) || pages.has(p)) return false;
      ids.add(s.id);
      pages.add(p);
      return true;
    });
    // Every card shows a preview. Curated components without one stay out of
    // the gallery (the MCP still serves them); saved ones wait for a capture.
    const curated = (catalog?.components ?? []).filter(
      (c) => c.preview && followed.has(c.library) && !ids.has(c.id) && !pages.has(page(c.docs)),
    );
    return [...unique, ...mix(curated)];
  }, [lib.bookmarks, catalog, followed]);

  const galleryView = useMemo(() => {
    const t = typeView(view);
    const s = siteView(view);
    if (s) return galleryItems.filter((i) => siteKey(i) === s);
    return t ? galleryItems.filter((i) => i.type === t) : galleryItems;
  }, [galleryItems, view]);

  // Library first: every site in the library, with its own components.
  const sites = useMemo(() => {
    const m = new Map<string, { key: string; name: string; items: GalleryItem[] }>();
    for (const i of galleryItems) {
      const key = siteKey(i);
      if (!m.has(key)) m.set(key, { key, name: i.site ?? catalog?.libraries.find((l) => l.id === i.library)?.name ?? i.library, items: [] });
      m.get(key)!.items.push(i);
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [galleryItems, catalog]);

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
          library: catalog?.libraries.find((x) => x.id === c.library)?.name ?? c.library,
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
    flash("Saved");
  };

  const setFollowed = (next: Set<string>) => update((l) => ({ ...l, sources: [...next] }));

  // A link to the home or index page of a curated site turns that site on,
  // instead of scraping it again.
  const followCurated = (raw: string) => {
    const url = normalizeUrl(raw);
    if (!url || !catalog) return false;
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const site = catalog.libraries.find((l) => {
      const lu = new URL(l.url);
      return lu.hostname.replace(/^www\./, "") === host && (u.pathname.replace(/\/$/, "") === lu.pathname.replace(/\/$/, "") || /^\/(docs\/?)?(components\/?)?$/.test(u.pathname));
    });
    if (!site) return false;
    if (!followed.has(site.id)) {
      setFollowed(new Set([...followed, site.id]));
      update((l) => ({ ...l, mode: l.mode ?? "scratch" }));
    }
    setView("library");
    flash(`${site.name}: ${site.count} components in your library`);
    return true;
  };
  const startImport = (raw: string) => {
    if (!followCurated(raw)) setImporting(raw);
  };
  const choose = (mode: "curated" | "scratch") =>
    update((l) => ({ ...l, mode, sources: mode === "curated" ? (catalog?.libraries ?? []).map((x) => x.id) : [] }));

  const enableSync = async () => {
    const key = newSyncKey();
    const next = { ...lib, syncKey: key, sources: [...followed], mode: lib.mode ?? "curated" };
    const ok = await pushLibrary(next);
    if (!ok) return flash("Could not connect. Try again later.");
    update((l) => ({ ...l, syncKey: key, sources: next.sources, mode: next.mode, syncedAt: Date.now() }));
    flash("Library connected");
  };

  const visible = useMemo(() => {
    const inView = selectView(lib, view).items;
    return libFilter ? inView.filter((b) => b.library === libFilter) : inView;
  }, [lib, view, libFilter]);

  const importedSites = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of lib.bookmarks) if (!b.ref) m.set(b.library, (m.get(b.library) ?? 0) + 1);
    return [...m].filter(([, n]) => n > 1).map(([name, count]) => ({ name, count }));
  }, [lib.bookmarks]);

  const libraries = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of lib.bookmarks) m.set(b.library, (m.get(b.library) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [lib.bookmarks]);

  useEffect(() => setSel(-1), [view, libFilter]);

  // The extension opens /app?import=<url> to add a whole site.
  useEffect(() => {
    const u = new URLSearchParams(window.location.search).get("import");
    if (!u || !catalog) return;
    startImport(u);
    window.history.replaceState(null, "", "/app");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog]);

  // Keyboard: arrows or j/k to move, Enter to open, c to copy, Backspace to delete.
  const navRef = useRef<{ visible: Bookmark[]; sel: number }>({ visible: [], sel: -1 });
  navRef.current = { visible: isGallery(view) || PAGES.has(view ?? "") ? [] : visible, sel };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (palette || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement)?.closest("input, textarea, select")) return;
      const { visible: v, sel: i } = navRef.current;
      if (!v.length) return;
      const cols = Math.max(1, Math.round((document.querySelector("[data-grid]")?.clientWidth ?? 1) / 340));
      const move = (d: number) => {
        e.preventDefault();
        const n = Math.min(v.length - 1, Math.max(0, (i < 0 ? -d : i) + d));
        setSel(n);
        document.querySelector(`[data-card="${v[n].id}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      };
      const cur = v[i];
      if (e.key === "ArrowRight" || e.key === "l") move(1);
      else if (e.key === "ArrowLeft" || e.key === "h") move(-1);
      else if (e.key === "ArrowDown" || e.key === "j") move(cols);
      else if (e.key === "ArrowUp" || e.key === "k") move(-cols);
      else if (e.key === "Escape") setSel(-1);
      else if (cur && e.key === "Enter") window.open(cur.url, "_blank", "noopener");
      else if (cur && e.key === "c") document.querySelector<HTMLButtonElement>(`[data-card="${cur.id}"] [data-copy]`)?.click();
      else if (cur && (e.key === "Backspace" || e.key === "Delete")) document.querySelector<HTMLButtonElement>(`[data-card="${cur.id}"] [data-delete]`)?.click();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [palette]);

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
    c.library = galleryItems.length;
    return c;
  }, [lib.bookmarks, galleryItems]);

  const current = typeof view === "string" && view !== "all" ? lib.collections.find((c) => c.id === view) : undefined;
  const viewType = typeView(view);
  const viewName =
    view === "library"
      ? "Library"
      : view === "all"
        ? "Saved"
        : viewType
            ? typeById(viewType).name
            : siteView(view)
              ? (sites.find((x) => x.key === siteView(view))?.name ?? "Library")
              : (current?.name ?? "Saved");
  const exportView = view;

  const setType = (bookmarkId: string, type: string) =>
    update((l) => ({ ...l, bookmarks: l.bookmarks.map((b) => (b.id === bookmarkId ? { ...b, type } : b)) }));

  const dropTo = (bookmarkId: string, target: View) => {
    const t = typeView(target);
    if (t) {
      setType(bookmarkId, t);
      flash(`Marked as ${typeById(t).name}`);
    } else moveTo(bookmarkId, target);
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
      const fresh: Bookmark[] = items
        .filter((i) => !have.has(i.url))
        .map((i, n) => ({
          id: uid(),
          ...(byDocs.get(i.url.replace(/\/$/, "")) ? { ref: byDocs.get(i.url.replace(/\/$/, ""))!.id } : {}),
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
      return { ...l, collections, bookmarks: [...fresh, ...l.bookmarks] };
    });
    setImporting(null);
    setView("library");
    flash(`Imported ${items.length} from ${result.site}`);
    capturePreviews(items.map((i) => i.url));
  };

  // Record a preview for each new card, one at a time, when the server has a
  // capture service. Cards update as each capture lands.
  const capturePreviews = async (urls: string[]) => {
    if (!(await getStatus()).capture) return;
    for (const url of urls) {
      try {
        const r = await fetch("/api/capture", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
        if (!r.ok) continue;
        const { image, video } = await r.json();
        update((l) => ({ ...l, bookmarks: l.bookmarks.map((b) => (b.url === url && !b.image ? { ...b, image, video } : b)) }));
      } catch {}
    }
  };

  const createCollection = (name: string) => {
    const n = name.trim();
    setNewCol(null);
    if (!n) return;
    const id = uid();
    update((l) => ({ ...l, collections: [...l.collections, { id, name: n, createdAt: Date.now() }] }));
    setView(id);
  };

  const renameCollection = (id: string, name: string) => {
    setRenaming(null);
    const n = name.trim();
    if (!n) return;
    update((l) => ({ ...l, collections: l.collections.map((c) => (c.id === id ? { ...c, name: n } : c)) }));
  };

  // Removes the collection only. Its components stay saved, with no collection.
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
    if (view === id) setView("all");
    flash(`Removed “${gone.name}”`, () => {
      update((l) => {
        if (l.collections.some((c) => c.id === gone.id)) return l;
        const collections = [...l.collections];
        collections.splice(Math.min(idx, collections.length), 0, gone);
        return {
          ...l,
          collections,
          bookmarks: l.bookmarks.map((b) => (members.has(b.id) && b.collectionId === null ? { ...b, collectionId: gone.id } : b)),
        };
      });
      setToast(null);
    });
  };

  const moveTo = (bookmarkId: string, collectionId: string | null) =>
    update((l) => ({
      ...l,
      bookmarks: l.bookmarks.map((b) => (b.id === bookmarkId ? { ...b, collectionId } : b)),
    }));

  const copy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(msg);
    } catch {
      flash("Copy failed");
    }
  };

  const copyInstall = () => {
    const cmds = visible.map((b) => b.install).filter(Boolean).join("\n");
    if (!cmds) return flash("No install commands here");
    copy(cmds, "Install commands copied");
  };

  const run = (fn: () => void) => () => {
    setPalette(false);
    fn();
  };

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar
        lib={lib}
        view={view}
        setView={setView}
        counts={counts}
        newCol={newCol}
        setNewCol={setNewCol}
        createCollection={createCollection}
        renaming={renaming}
        setRenaming={setRenaming}
        renameCollection={renameCollection}
        deleteCollection={setConfirmDel}
        moveTo={dropTo}
        sites={sites}
        openItem={setOpen}
        openId={open?.id}
      />

      <main className="min-w-0 flex-1 px-4 pb-24 md:pr-10 md:pl-2">
        <header className="sticky top-0 z-10 -mx-4 bg-bg/90 px-4 backdrop-blur-md md:mr-0 md:ml-0 md:px-0">
          <form
            className="flex h-14 items-center gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              add(input);
              setInput("");
            }}
          >
            <div className="flex h-9 w-full items-center gap-2.5 rounded-lg bg-field px-3 transition-colors focus-within:bg-field-focus">
            <PlusIcon />
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste a link"
              className="h-full w-full bg-transparent outline-none placeholder:text-faint"
              aria-label="Component link"
              autoComplete="off"
              spellCheck={false}
            />
            {input.trim() && (
              <button
                type="button"
                onClick={() => {
                  startImport(input);
                  setInput("");
                }}
                title="Find every component on this site and sort them by type"
                className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] whitespace-nowrap text-muted transition hover:text-fg"
              >
                Import site
              </button>
            )}
            <button
              type="button"
              onClick={() => setPalette(true)}
              className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] text-faint transition hover:text-muted"
              aria-label="Open command menu"
            >
              ⌘K
            </button>
            </div>
            <GitHubLink />
          </form>
        </header>

        {isGallery(view) ? (
          ready && catalog && !lib.mode && lib.bookmarks.length === 0 ? (
            <Onboarding libraries={catalog.libraries} total={catalog.components.length} onChoose={choose} />
          ) : (
            <Gallery
              items={galleryView}
              title={viewName}
              sections={view === "library" && sites.length > 1 ? sites : undefined}
              onSite={(key) => setView(`site:${key}`)}
              libraries={catalog?.libraries ?? []}
              onOpen={setOpen}
              empty={
                <div className="mx-auto max-w-sm pt-20 text-center">
                  <p>Your library is empty.</p>
                  <p className="mt-1 text-muted">Paste the link of a component library above, or turn on curated sites.</p>
                  <button onClick={() => setView("sites")} className="mt-5 text-[12px] text-muted transition hover:text-fg">
                    Choose sites
                  </button>
                </div>
              }
            />
          )
        ) : view === "sites" ? (
          <Sources
            libraries={catalog?.libraries ?? []}
            followed={followed}
            onToggle={(id) => {
              const next = new Set(followed);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              setFollowed(next);
            }}
            onAll={(on) => setFollowed(new Set(on ? (catalog?.libraries ?? []).map((l) => l.id) : []))}
            onAddSite={() => setImporting("")}
            imported={importedSites}
          />
        ) : view === "agents" ? (
          <Agents
            syncKey={lib.syncKey}
            syncedAt={lib.syncedAt}
            available={syncOk}
            onEnable={enableSync}
            onSyncNow={async () => flash((await pushLibrary(lib)) ? "Synced" : "Sync failed")}
            copy={copy}
          />
        ) : (
        <>
        <div className="flex h-12 items-center justify-between">
          <h1 className="flex items-baseline gap-2">
            <span className="font-medium">{viewName}</span>
            <span className="text-faint tabular-nums">{visible.length || ""}</span>
          </h1>
          {libFilter && (
            <button onClick={() => setLibFilter(null)} className="text-[12px] text-muted transition hover:text-fg" title="Clear filter">
              {libFilter} <span className="text-faint">×</span>
            </button>
          )}
        </div>

        {ready && lib.bookmarks.length === 0 ? (
          <Empty onAdd={(u) => add(`https://${u}`)} />
        ) : ready && visible.length === 0 ? (
          <p className="pt-16 text-center text-muted">Empty. Paste a link or drag cards here.</p>
        ) : (
          <div data-grid className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visible.map((b) => (
              <Card
                key={b.id}
                b={b}
                lib={lib}
                selected={visible[sel]?.id === b.id}
                onMove={(cid) => {
                  moveTo(b.id, cid);
                  flash(`Moved to ${cid ? lib.collections.find((c) => c.id === cid)?.name : "no collection"}`);
                }}
                onDelete={() => removeBookmark(b.id)}
                onType={(t) => setType(b.id, t)}
                onNote={(note) =>
                  update((l) => ({
                    ...l,
                    bookmarks: l.bookmarks.map((x) => (x.id === b.id ? { ...x, note } : x)),
                  }))
                }
                onCopy={() => (b.install ? copy(b.install, "Command copied") : copy(b.url, "Link copied"))}
              />
            ))}
          </div>
        )}
        </>
        )}
      </main>

      {open && (
        <Detail
          item={open}
          site={open.site ?? catalog?.libraries.find((l) => l.id === open.library)?.name ?? open.library}
          saved={Boolean(open.saved) || lib.bookmarks.some((b) => b.ref === open.id)}
          onClose={() => setOpen(null)}
          onSave={() => saveFromCatalog(open)}
          copy={copy}
        />
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            const data = JSON.parse(await f.text()) as Library;
            update((l) => mergeLibrary(l, data));
            flash("Imported");
          } catch {
            flash("Not a quire file");
          }
          e.target.value = "";
        }}
      />

      <Command.Dialog
        open={palette}
        onOpenChange={setPalette}
        label="Command menu"
        className="overflow-hidden rounded-xl border border-line bg-panel shadow-[0_16px_48px_-12px_rgb(0_0_0/0.25)]"
      >
        <Command.Input
          autoFocus
          placeholder="Search or run a command"
          className="m-1.5 mb-0 block h-10 w-[calc(100%-0.75rem)] rounded-lg bg-field px-3 outline-none transition-colors placeholder:text-faint focus:bg-field-focus"
        />
        <Command.List className="max-h-[52vh] overflow-y-auto p-1.5">
          <Command.Empty className="px-3 py-8 text-center text-muted">No results</Command.Empty>
          {lib.bookmarks.length > 0 && (
            <Command.Group heading="Bookmarks">
              {lib.bookmarks.map((b) => (
                <Command.Item
                  key={b.id}
                  value={`${b.title} ${b.library} ${b.tags.join(" ")} ${b.note ?? ""} ${b.id}`}
                  onSelect={run(() => window.open(b.url, "_blank", "noopener"))}
                  className={itemCls}
                >
                  <span className="truncate">{b.title}</span>
                  <span className="ml-auto shrink-0 text-muted">{b.library}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
          <Command.Group heading="Go to">
            {[
              { id: "all", name: "All" },
              ...lib.collections,
              ...[...TYPES, OTHER].filter((t) => counts[`type:${t.id}`]).map((t) => ({ id: `type:${t.id}`, name: t.name })),
            ].map((c) => (
              <Command.Item
                key={c.id}
                value={`go ${c.name} ${c.id}`}
                onSelect={run(() => setView(c.id))}
                className={itemCls}
              >
                {c.name}
              </Command.Item>
            ))}
          </Command.Group>
          {libraries.length > 1 && (
            <Command.Group heading="Filter by library">
              {libraries.map((name) => (
                <Command.Item key={name} value={`filter library ${name}`} onSelect={run(() => setLibFilter(name))} className={itemCls}>
                  {name}
                  {libFilter === name && <span className="ml-auto text-faint">on</span>}
                </Command.Item>
              ))}
            </Command.Group>
          )}
          <Command.Group heading={`Agent · ${viewName}`}>
            <Command.Item onSelect={run(() => copy(exportMarkdown(lib, exportView), "Copied for your agent"))} className={itemCls}>
              Copy as Markdown for an AI agent
            </Command.Item>
            <Command.Item onSelect={run(() => copy(exportJSON(lib, exportView), "Copied as JSON"))} className={itemCls}>
              Copy as JSON for an AI agent
            </Command.Item>
            <Command.Item onSelect={run(copyInstall)} className={itemCls}>
              Copy install commands
            </Command.Item>
          </Command.Group>
          <Command.Group heading="Library">
            <Command.Item onSelect={run(() => setImporting(""))} className={itemCls}>
              Import every component from a site
            </Command.Item>
            <Command.Item onSelect={run(() => setNewCol(""))} className={itemCls}>
              New collection
            </Command.Item>
            {current && (
              <>
                <Command.Item onSelect={run(() => setRenaming(current.id))} className={itemCls}>
                  Rename “{current.name}”
                </Command.Item>
                <Command.Item onSelect={run(() => setConfirmDel(current.id))} className={itemCls}>
                  Delete “{current.name}”
                </Command.Item>
              </>
            )}
            <Command.Item onSelect={run(() => download(lib))} className={itemCls}>
              Export backup (JSON)
            </Command.Item>
            <Command.Item onSelect={run(() => fileRef.current?.click())} className={itemCls}>
              Import backup
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command.Dialog>

      {confirmDel !== null && (
        <ConfirmRemove
          name={lib.collections.find((c) => c.id === confirmDel)?.name ?? "this collection"}
          count={lib.bookmarks.filter((b) => b.collectionId === confirmDel).length}
          onCancel={() => setConfirmDel(null)}
          onConfirm={() => {
            deleteCollection(confirmDel);
            setConfirmDel(null);
          }}
        />
      )}

      {importing !== null && (
        <ImportDialog
          initialUrl={importing}
          savedUrls={new Set(lib.bookmarks.map((b) => b.url))}
          onClose={() => setImporting(null)}
          onImport={importSite}
        />
      )}

      {toast && (
        <div
          role="status"
          className="pop fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-line bg-panel px-3.5 py-1.5 text-muted shadow-[0_6px_20px_-8px_rgb(0_0_0/0.2)]"
        >
          {toast.msg}
          {toast.undo && (
            <button onClick={toast.undo} className="text-fg transition hover:opacity-70">
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const itemCls = "flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-muted";

// Link to the source on GitHub, top right of the main view.
function GitHubLink() {
  return (
    <a
      href="https://github.com/rickmff/quire"
      target="_blank"
      rel="noreferrer"
      aria-label="Quire on GitHub (open source, MIT)"
      title="Open source · MIT"
      className="hidden size-7 shrink-0 place-items-center rounded-md text-faint transition hover:text-muted md:grid"
    >
      <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
      </svg>
    </a>
  );
}

function Sidebar(props: {
  lib: Library;
  view: View;
  setView: (v: View) => void;
  counts: Record<string, number>;
  newCol: string | null;
  setNewCol: (v: string | null) => void;
  createCollection: (name: string) => void;
  renaming: string | null;
  setRenaming: (id: string | null) => void;
  renameCollection: (id: string, name: string) => void;
  deleteCollection: (id: string) => void;
  moveTo: (bookmarkId: string, target: View) => void;
  sites: { key: string; name: string; items: GalleryItem[] }[];
  openItem: (item: GalleryItem) => void;
  openId?: string;
}) {
  const { lib, view, setView, counts, newCol, setNewCol, sites, openItem, openId } = props;
  const activeSite = siteView(view);

  // Ticks within ~3 rows of the pointer grow, nearest the most.
  const ruler = useRef<HTMLElement>(null);
  const grow = (e: React.MouseEvent) => {
    for (const el of ruler.current?.querySelectorAll<HTMLElement>("[data-row]") ?? []) {
      const r = el.getBoundingClientRect();
      const d = Math.abs(e.clientY - (r.top + r.height / 2)) / r.height;
      el.style.setProperty("--grow", String(Math.max(0, 1 - d / 3).toFixed(2)));
    }
  };
  const settle = () => ruler.current?.querySelectorAll<HTMLElement>("[data-row]").forEach((el) => el.style.removeProperty("--grow"));
  useEffect(() => {
    ruler.current?.querySelector("[aria-current=page]")?.scrollIntoView({ block: "nearest" });
  }, [view]);

  return (
    <aside className="md:sticky md:top-0 md:h-dvh md:w-56 md:shrink-0">
      <div className="flex h-full flex-col px-3 pt-4 md:px-4">
        <div className="flex h-10 items-center px-2 md:h-6 md:pl-[34px]">
          <Wordmark className="h-[15px] w-auto text-fg" />
        </div>

        <nav
          ref={ruler}
          onMouseMove={grow}
          onMouseLeave={settle}
          className="ruler -mx-1 mt-2 flex gap-0.5 overflow-x-auto pb-2 md:mx-0 md:mt-2 md:min-h-0 md:flex-1 md:flex-col md:gap-0 md:overflow-y-auto"
        >
          <NavItem id="library" name="Library" count={counts.library ?? 0} {...props} />
          <NavItem id="all" name="Saved" count={lib.bookmarks.length} {...props} />
          <div className="hidden h-6 md:block" />
          {lib.collections.map((c) =>
            props.renaming === c.id ? (
              <input
                key={c.id}
                autoFocus
                defaultValue={c.name}
                onBlur={(e) => props.renameCollection(c.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") props.setRenaming(null);
                }}
                className="h-7 shrink-0 rounded-md bg-field px-2 outline-none transition-colors focus:bg-field-focus md:ml-[34px]"
              />
            ) : (
              <NavItem key={c.id} id={c.id} name={c.name} count={counts[c.id] ?? 0} onRename={() => props.setRenaming(c.id)} onDelete={() => props.deleteCollection(c.id)} {...props} />
            ),
          )}
          {newCol !== null ? (
            <input
              autoFocus
              value={newCol}
              onChange={(e) => setNewCol(e.target.value)}
              onBlur={() => props.createCollection(newCol)}
              onKeyDown={(e) => {
                if (e.key === "Enter") props.createCollection(newCol);
                if (e.key === "Escape") setNewCol(null);
              }}
              placeholder="Name"
              className="h-7 shrink-0 rounded-md bg-field px-2 outline-none transition-colors focus:bg-field-focus placeholder:text-faint md:ml-[34px]"
            />
          ) : (
            <button
              onClick={() => setNewCol("")}
              className="h-7 shrink-0 rounded-md px-2 text-left whitespace-nowrap text-faint transition hover:text-muted md:pl-[34px]"
            >
              New collection
            </button>
          )}
          {sites.length > 0 && (
            <>
              <div className="hidden h-6 md:block" />
              <span className="hidden pb-1 pl-[34px] text-[11px] text-faint md:block">Libraries</span>
              {sites.map((x) => (
                <div key={x.key} className="contents">
                  <NavItem id={`site:${x.key}`} name={x.name} count={x.items.length} {...props} />
                  {activeSite === x.key && <SiteGroups items={x.items} openItem={openItem} openId={openId} />}
                </div>
              ))}
            </>
          )}
        </nav>

        <div className="-mx-1 flex shrink-0 gap-0.5 pb-2 md:mx-0 md:flex-col md:border-t md:border-line md:pt-3 md:pb-5">
          <NavItem id="sites" name="Sites" count={0} {...props} />
          <NavItem id="agents" name="Agents" count={0} {...props} />
        </div>
      </div>
    </aside>
  );
}

// Large families split into their types, so no group runs past a screen.
const SPLIT_AT = 15;
const FAMILY_LABEL: Record<string, string> = {
  Input: "Inputs",
  Overlay: "Overlays",
  Section: "Sections",
  Effect: "Effects",
};
const TYPE_LABEL: Record<string, string> = {
  "text-effect": "Text effects",
  background: "Backgrounds",
  cursor: "Cursors",
  button: "Buttons",
  card: "Cards",
};

function groupItems(items: GalleryItem[]) {
  const byFamily = new Map<string, GalleryItem[]>();
  for (const i of items) {
    const f = typeById(i.type).family;
    byFamily.set(f, [...(byFamily.get(f) ?? []), i]);
  }
  const groups: { key: string; name: string; items: GalleryItem[] }[] = [];
  for (const [family, list] of byFamily) {
    if (list.length <= SPLIT_AT || family === OTHER.family) {
      groups.push({ key: family, name: FAMILY_LABEL[family] ?? family, items: list });
      continue;
    }
    const byType = new Map<string, GalleryItem[]>();
    for (const i of list) byType.set(i.type, [...(byType.get(i.type) ?? []), i]);
    for (const [t, l] of byType) groups.push({ key: `${family}/${t}`, name: TYPE_LABEL[t] ?? typeById(t).name, items: l });
  }
  // Biggest groups first; "Other" always last.
  return groups.sort((a, b) => Number(a.key === OTHER.family) - Number(b.key === OTHER.family) || b.items.length - a.items.length || a.name.localeCompare(b.name));
}

function SiteGroups({ items, openItem, openId }: { items: GalleryItem[]; openItem: (item: GalleryItem) => void; openId?: string }) {
  const groups = useMemo(() => groupItems(items), [items]);
  // One group open at a time, like an accordion.
  const [open, setOpen] = useState<string | null>(null);
  // The group that holds the open component opens with it.
  useEffect(() => {
    const g = groups.find((g) => g.items.some((i) => i.id === openId));
    if (g) setOpen(g.key);
  }, [groups, openId]);
  const toggle = (k: string) => setOpen((o) => (o === k ? null : k));

  return (
    <div className="hidden md:contents">
      {groups.map((g) => {
        const expanded = open === g.key;
        return (
          <div key={g.key} className="contents">
            <button
              data-row
              aria-expanded={expanded}
              onClick={() => toggle(g.key)}
              className="group flex h-6 shrink-0 items-center gap-2 pl-3 text-left text-[12px] whitespace-nowrap text-muted transition hover:text-fg"
            >
              <span className="flex w-[26px] shrink-0 items-center">
                <svg
                  viewBox="0 0 8 8"
                  className={`size-2 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
                  aria-hidden
                >
                  <path d="M2.5 1.5 5.5 4l-3 2.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="min-w-0 flex-1 truncate">{g.name}</span>
              <span className="text-[11px] tabular-nums">{g.items.length}</span>
            </button>
            {expanded &&
              g.items.map((i) => (
                <button
                  key={i.id}
                  data-row
                  aria-current={openId === i.id ? "page" : undefined}
                  onClick={() => openItem(i)}
                  className="group flex h-7 shrink-0 items-center gap-2 rounded-md pr-2 pl-6 text-left text-[13px] whitespace-nowrap text-fg transition hover:bg-hover aria-[current=page]:hover:bg-transparent"
                >
                  <span className="w-[26px] shrink-0">
                    <span data-tick className={`block h-px ${openId === i.id ? "" : "bg-faint group-hover:bg-fg"}`} />
                  </span>
                  <span data-label className="min-w-0 flex-1 truncate first-letter:uppercase">
                    {i.title}
                  </span>
                </button>
              ))}
          </div>
        );
      })}
    </div>
  );
}

function ConfirmRemove({
  name,
  count,
  onCancel,
  onConfirm,
}: {
  name: string;
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/30 p-4 pt-[20vh]"
      onMouseDown={onCancel}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-remove-title"
        aria-describedby="confirm-remove-desc"
        onMouseDown={(e) => e.stopPropagation()}
        className="pop w-full max-w-sm rounded-xl border border-line bg-panel p-4 shadow-[0_16px_48px_-12px_rgb(0_0_0/0.25)]"
      >
        <p id="confirm-remove-title" className="text-fg">
          Remove “{name}”?
        </p>
        <p id="confirm-remove-desc" className="mt-1 text-muted">
          {count
            ? `Its ${count} component${count === 1 ? "" : "s"} stay saved, with no collection.`
            : "The collection is empty."}
        </p>
        <div className="mt-4 flex justify-end gap-1.5">
          <button onClick={onCancel} className="rounded-md px-3 py-1 text-muted transition hover:bg-hover hover:text-fg">
            Cancel
          </button>
          <button autoFocus onClick={onConfirm} className="rounded-md bg-fg px-3 py-1 text-bg transition hover:opacity-85">
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function NavItem({
  id,
  name,
  count,
  view,
  setView,
  moveTo,
  onRename,
  onDelete,
}: {
  id: View;
  name: string;
  count: number;
  view: View;
  setView: (v: View) => void;
  moveTo: (bookmarkId: string, target: View) => void;
  onRename?: () => void;
  onDelete?: () => void;
}) {
  const [over, setOver] = useState(false);
  const active = view === id;
  const droppable = id !== "all" && !(typeof id === "string" && (PAGES.has(id) || id.startsWith("site:")));
  return (
    <button
      onClick={() => setView(id)}
      onDoubleClick={onRename}
      onDragOver={(e) => {
        if (!droppable) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        const bid = e.dataTransfer.getData("text/bookmark-id");
        if (bid && droppable) moveTo(bid, id);
      }}
      title={onRename ? "Double-click to rename" : undefined}
      data-row
      aria-current={active ? "page" : undefined}
      className={`group flex h-7 shrink-0 items-center gap-2 rounded-md px-2 text-left whitespace-nowrap transition md:rounded-none md:px-0 ${
        active ? "bg-hover text-fg md:bg-transparent" : "text-muted hover:text-fg"
      } ${over ? "bg-hover text-fg" : ""}`}
    >
      <span className="hidden w-[26px] shrink-0 md:block">
        <span data-tick className={`block h-px ${active ? "" : "bg-faint group-hover:bg-muted"}`} />
      </span>
      <span data-label className="min-w-0 flex-1 truncate">{name}</span>
      <span className={`text-[11px] tabular-nums text-faint transition ${active ? "" : "opacity-0 group-hover:opacity-100"}`}>
        {count || ""}
      </span>
      {onDelete && (
        // A span, not a button: it sits inside the row's button.
        <span
          role="button"
          tabIndex={0}
          aria-label={`Remove collection “${name}”`}
          title="Remove collection"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          onDoubleClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          className="-my-1 grid size-5 shrink-0 place-items-center rounded text-faint opacity-0 transition hover:bg-hover hover:text-fg focus-visible:opacity-100 group-hover:opacity-100"
        >
          <TrashIcon />
        </span>
      )}
    </button>
  );
}

function Card({
  b,
  lib,
  selected,
  onMove,
  onDelete,
  onType,
  onNote,
  onCopy,
}: {
  b: Bookmark;
  lib: Library;
  selected: boolean;
  onMove: (cid: string | null) => void;
  onDelete: () => void;
  onType: (type: string) => void;
  onNote: (note: string) => void;
  onCopy: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [imgOk, setImgOk] = useState(true);

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/bookmark-id", b.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      data-card={b.id}
      className="group pop"
    >
      <div className="relative">
        <a
          href={b.url}
          target="_blank"
          rel="noreferrer"
          className={`block aspect-[16/10] overflow-hidden rounded-lg bg-hover ring-inset transition ${selected ? "ring-2 ring-faint" : "ring-1 ring-line"}`}
          tabIndex={-1}
        >
          {b.image && imgOk ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={b.image}
              alt=""
              loading="lazy"
              draggable={false}
              onError={() => setImgOk(false)}
              className="size-full object-cover transition duration-500 ease-out group-hover:scale-[1.015]"
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2.5">
              <Favicon url={b.url} />
              <span className="text-[15px] font-medium tracking-tight text-faint">{b.library}</span>
            </div>
          )}
        </a>

        <div className="absolute top-2 right-2 flex items-center gap-0.5 rounded-md bg-panel/90 p-0.5 opacity-0 shadow-sm ring-1 ring-line backdrop-blur transition group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
          <IconBtn label={b.install ? "Copy install command" : "Copy link"} onClick={onCopy} data="copy">
            <CopyIcon />
          </IconBtn>
          <IconBtn label="Note for your agent" onClick={() => setEditing(true)}>
            <NoteIcon />
          </IconBtn>
          <label className="relative grid size-6 cursor-pointer place-items-center rounded text-muted transition hover:bg-hover hover:text-fg" title="Move to collection">
            <FolderIcon />
            <select
              value={b.collectionId ?? ""}
              onChange={(e) => onMove(e.target.value || null)}
              aria-label="Move to collection"
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              <option value="">No collection</option>
              {lib.collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="relative grid size-6 cursor-pointer place-items-center rounded text-muted transition hover:bg-hover hover:text-fg" title="Change type">
            <TagIcon />
            <select
              value={typeOf(b)}
              onChange={(e) => onType(e.target.value)}
              aria-label="Component type"
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              {[...TYPES, OTHER].map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <IconBtn label="Delete" onClick={onDelete} data="delete">
            <TrashIcon />
          </IconBtn>
        </div>
      </div>

      <div className="mt-2.5 px-0.5">
        <div className="flex items-baseline justify-between gap-3">
          <a href={b.url} target="_blank" rel="noreferrer" className="truncate first-letter:uppercase">
            {b.title}
          </a>
          <span className="shrink-0 text-[12px] text-faint">{b.library}</span>
        </div>
        <p className="mt-0.5 truncate text-[12px] text-faint">
          {typeById(typeOf(b)).name}
          {b.description && <span className="text-faint"> · {b.description}</span>}
        </p>

        {b.install && (
          <button
            onClick={onCopy}
            title="Copy"
            className="mt-1 block max-w-full truncate text-left font-mono text-[11px] text-faint transition hover:text-muted"
          >
            {b.install}
          </button>
        )}

        {editing ? (
          <textarea
            autoFocus
            rows={2}
            defaultValue={b.note}
            placeholder="A note for your agent"
            onBlur={(e) => {
              onNote(e.target.value.trim());
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) (e.target as HTMLTextAreaElement).blur();
              if (e.key === "Escape") setEditing(false);
            }}
            className="mt-1.5 w-full resize-none rounded-md bg-field px-2 py-1.5 text-[12px] outline-none transition-colors focus:bg-field-focus placeholder:text-faint"
          />
        ) : (
          b.note && (
            <p onClick={() => setEditing(true)} className="mt-1 line-clamp-2 cursor-text text-[12px] text-muted">
              {b.note}
            </p>
          )
        )}
      </div>
    </article>
  );
}

function IconBtn({ label, onClick, children, data }: { label: string; onClick: () => void; children: React.ReactNode; data?: string }) {
  return (
    <button
      onClick={onClick}
      {...(data ? { [`data-${data}`]: "" } : {})}
      aria-label={label}
      title={label}
      className="grid size-6 place-items-center rounded text-muted transition hover:bg-hover hover:text-fg"
    >
      {children}
    </button>
  );
}

function Empty({ onAdd }: { onAdd: (url: string) => void }) {
  return (
    <div className="mx-auto max-w-sm pt-24 text-center">
      <p className="text-fg">Paste a component link.</p>
      <p className="mt-1 text-muted">From any library. Press ⌘V anywhere.</p>
      <div className="mt-8 flex flex-col items-center gap-1">
        {EXAMPLES.map((u) => (
          <button
            key={u}
            onClick={() => onAdd(u)}
            className="rounded-md px-2 py-1 font-mono text-[11px] text-faint transition hover:bg-hover hover:text-muted"
          >
            {u}
          </button>
        ))}
      </div>
    </div>
  );
}

const svg = {
  width: 14,
  height: 14,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function PlusIcon() {
  return (
    <svg {...svg} className="shrink-0 text-faint" aria-hidden>
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg {...svg} aria-hidden>
      <rect x="5.5" y="5.5" width="7.5" height="7.5" rx="1.5" />
      <path d="M10.5 3.5v-.25A1.25 1.25 0 0 0 9.25 2h-5A1.25 1.25 0 0 0 3 3.25v5A1.25 1.25 0 0 0 4.25 9.5h.25" />
    </svg>
  );
}
function NoteIcon() {
  return (
    <svg {...svg} aria-hidden>
      <path d="M10.5 2.75 13.25 5.5 6 12.75H3.25V10z" />
    </svg>
  );
}
function FolderIcon() {
  return (
    <svg {...svg} aria-hidden>
      <path d="M2.5 4.75c0-.7.55-1.25 1.25-1.25h2.6l1.4 1.5h4.5c.7 0 1.25.55 1.25 1.25v5c0 .7-.55 1.25-1.25 1.25h-8.5c-.7 0-1.25-.55-1.25-1.25z" />
    </svg>
  );
}
function TagIcon() {
  return (
    <svg {...svg} aria-hidden>
      <path d="M2.75 8.25V3.5c0-.4.35-.75.75-.75h4.75l5 5-5.5 5.5z" />
      <circle cx="5.5" cy="5.5" r=".9" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg {...svg} aria-hidden>
      <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.5 8.5h6l.5-8.5" />
    </svg>
  );
}

function download(lib: Library) {
  const blob = new Blob([JSON.stringify(lib, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `quire-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function mergeLibrary(a: Library, b: Library): Library {
  if (!b || !Array.isArray(b.bookmarks)) return a;
  const urls = new Set(a.bookmarks.map((x) => x.url));
  const colIds = new Set(a.collections.map((c) => c.id));
  return {
    version: 1,
    collections: [...a.collections, ...(b.collections ?? []).filter((c) => !colIds.has(c.id))],
    bookmarks: [...b.bookmarks.filter((x) => !urls.has(x.url)), ...a.bookmarks],
  };
}

function Favicon({ url }: { url: string }) {
  const [ok, setOk] = useState(true);
  let src = "";
  try {
    src = new URL("/favicon.ico", url).href;
  } catch {}
  if (!src || !ok) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={20} height={20} onError={() => setOk(false)} className="size-5 rounded opacity-70 grayscale" />;
}

// Gallery order: components with a preview first, then the rest, each part
// interleaved across sites so no single library fills the first screen.
function mix<T extends { library: string; preview?: string }>(items: T[]): T[] {
  const deal = (list: T[]) => {
    const by = new Map<string, T[]>();
    for (const i of list) by.set(i.library, [...(by.get(i.library) ?? []), i]);
    const queues = [...by.values()];
    const out: T[] = [];
    for (let n = 0; out.length < list.length; n++) for (const q of queues) if (q[n]) out.push(q[n]);
    return out;
  };
  return [...deal(items.filter((i) => i.preview)), ...deal(items.filter((i) => !i.preview))];
}
