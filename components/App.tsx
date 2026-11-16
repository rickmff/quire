"use client";

import { Command } from "cmdk";
import SocialLinks from "@/components/SocialLinks";
import { Tip } from "@/components/ui/tooltip";
import { PlusIcon as Plus, SearchIcon } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  type Bookmark,
  type Library,
  exportMarkdown,
  exportJSON,
  fetchMeta,
  normalizeUrl,
  selectView,
  uid,
  useLibrary,
} from "@/lib/store";
import { matchLibrary, titleFromUrl } from "@/lib/libraries";
import { OTHER, TYPES, typeById } from "@/lib/types";
import { usePathname } from "next/navigation";
import ImportDialog, { type ImportChoice } from "@/components/ImportDialog";
import { Agents } from "@/components/gallery/Agents";
import { Detail } from "@/components/gallery/Detail";
import { Gallery } from "@/components/gallery/Gallery";
import { Sources } from "@/components/gallery/Sources";
import { type GalleryItem, getStatus, useCatalog, useSyncAvailable } from "@/lib/useCatalog";
import { newSyncKey, pushLibrary, toComponent } from "@/lib/store";
import { agentText } from "@/lib/agentText";
import { useIntro } from "@/lib/useIntro";
import { PAGES, type View, groupView, isGallery, pathView, siteKey, siteView, typeView, viewPath } from "@/lib/view";
import { Sidebar, type SidebarEdit } from "@/components/app/Sidebar";
import { groupItems, groupLabel, mix } from "@/lib/groups";
import { Card, StarredTools } from "@/components/app/CollectionCard";
import { Empty } from "@/components/app/Empty";
import { download, mergeLibrary } from "@/lib/libraryFile";
import { ConfirmRemove } from "@/components/app/ConfirmRemove";

export default function App() {
  const { lib, ready, update } = useLibrary();
  const pathname = usePathname();
  const [view, setViewRaw] = useState<View>(() => pathView(pathname));
  const setView = useCallback((v: View) => {
    const next = v === "all" || v === "library" ? "starred" : v;
    setViewRaw(next);
    const path = viewPath(next);
    if (path !== window.location.pathname) window.history.pushState(null, "", path);
  }, []);
  useEffect(() => setViewRaw(pathView(pathname)), [pathname]);
  const catalog = useCatalog();
  const syncOk = useSyncAvailable();
  const [open, setOpen] = useState<GalleryItem | null>(null);

  const intro = useIntro();
  const mainRef = useRef<HTMLElement>(null);
  const shownView = useRef(view);
  useLayoutEffect(() => {
    if (shownView.current === view) return;
    shownView.current = view;
    const main = mainRef.current;
    if (!main || intro.phase !== "done" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const vh = window.innerHeight;
    const els = [...main.querySelectorAll<HTMLElement>("h1, section > button[data-chrome], [data-grid] > *")].filter(
      (el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.top < vh && r.bottom > 0;
      },
    );
    els.forEach((el, i) =>
      el.animate(
        [
          { opacity: 0, transform: "translateY(8px) scale(.985)", filter: "blur(2px)" },
          { opacity: 1, transform: "none", filter: "none" },
        ],
        { duration: 360, delay: Math.min(i, 10) * 28, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" },
      ),
    );
  }, [view, intro.phase]);

  useEffect(() => {
    navigator.serviceWorker
      ?.getRegistrations()
      .then((rs) => rs.forEach((r) => r.unregister()))
      .catch(() => {});
  }, []);
  const [input, setInput] = useState("");
  const [barMode, setBarMode] = useState<"search" | "add">("search");
  const query = barMode === "search" ? input.trim().toLowerCase() : "";
  const words = useMemo(() => query.split(/\s+/).filter(Boolean), [query]);
  const [palette, setPalette] = useState(false);
  const [toast, setToast] = useState<{ msg: string; undo?: () => void } | null>(null);
  const [edit, setEdit] = useState<SidebarEdit>(null);
  const [dialog, setDialog] = useState<AppDialog>(null);
  const [libFilter, setLibFilter] = useState<string | null>(null);
  const [sel, setSel] = useState(-1);
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
    flash("Removed from Starred", () => {
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
    },
    [lib.bookmarks, update, view, flash, catalog],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest("input, textarea, select");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      } else if ((e.key === "/" || e.key === "+") && !typing) {
        e.preventDefault();
        setBarMode(e.key === "/" ? "search" : "add");
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

  const fresh = !lib.mode && lib.bookmarks.length === 0;

  const followed = useMemo(() => {
    if (lib.sources) return new Set(lib.sources);
    return new Set((lib.mode === "curated" || fresh) && catalog ? catalog.libraries.map((l) => l.id) : []);
  }, [lib.sources, lib.mode, fresh, catalog]);

  useEffect(() => {
    if (ready && catalog && fresh)
      update((l) => (l.mode ? l : { ...l, mode: "curated", sources: l.sources ?? catalog.libraries.map((x) => x.id) }));
  }, [ready, catalog, fresh, update]);

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
    const page = (u: string) =>
      u
        .replace(/^https?:\/\/(www\.)?/, "")
        .replace(/[#?].*$/, "")
        .replace(/\/$/, "")
        .toLowerCase();
    const ids = new Set<string>();
    const pages = new Set<string>();
    const unique = saved.filter((s) => {
      const p = page(s.docs);
      if (ids.has(s.id) || pages.has(p)) return false;
      ids.add(s.id);
      pages.add(p);
      return true;
    });
    const curated = (catalog?.components ?? []).filter(
      (c) => c.preview && followed.has(c.library) && !ids.has(c.id) && !pages.has(page(c.docs)),
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
    return inView.filter((i) => {
      const hay =
        `${i.title} ${i.name} ${i.description ?? ""} ${i.category ?? ""} ${i.site ?? i.library} ${typeById(i.type).name} ${i.tech.join(" ")}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [galleryItems, view, words]);

  const nothingToDeal = Boolean(ready && catalog) && (!isGallery(view) || galleryView.length === 0);
  useEffect(() => {
    if (nothingToDeal) intro.skip();
  }, [nothingToDeal, intro.skip]);

  const sites = useMemo(() => {
    const m = new Map<string, { key: string; name: string; items: GalleryItem[] }>();
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
        (u.pathname.replace(/\/$/, "") === lu.pathname.replace(/\/$/, "") ||
          /^\/(docs\/?)?(components\/?)?$/.test(u.pathname))
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
  const startImport = (raw: string) => {
    if (!followCurated(raw)) setDialog({ kind: "import", url: raw });
  };

  const enableSync = async () => {
    const key = newSyncKey();
    const next = { ...lib, syncKey: key, sources: [...followed], mode: lib.mode ?? "curated" };
    const ok = await pushLibrary(next);
    if (!ok) return flash("Could not connect. Try again later.");
    update((l) => ({ ...l, syncKey: key, sources: next.sources, mode: next.mode, syncedAt: Date.now() }));
    flash("Library connected");
  };

  const visible = useMemo(() => {
    const inView = selectView(lib, view).items.filter((b) => !libFilter || b.library === libFilter);
    if (!words.length) return inView;
    return inView.filter((b) => {
      const hay = `${b.title} ${b.url} ${b.library} ${b.description ?? ""} ${b.note ?? ""}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [lib, view, libFilter, words]);

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

  useEffect(() => {
    const u = new URLSearchParams(window.location.search).get("import");
    if (!u || !catalog) return;
    startImport(u);
    window.history.replaceState(null, "", window.location.pathname);
  }, [catalog]);

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
      else if (cur && e.key === "c")
        document.querySelector<HTMLButtonElement>(`[data-card="${cur.id}"] [data-copy]`)?.click();
      else if (cur && (e.key === "Backspace" || e.key === "Delete"))
        document.querySelector<HTMLButtonElement>(`[data-card="${cur.id}"] [data-star]`)?.click();
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
    c.starred = galleryItems.filter((i) => i.saved).length;
    return c;
  }, [lib.bookmarks, galleryItems]);

  const current = typeof view === "string" && view !== "all" ? lib.collections.find((c) => c.id === view) : undefined;
  const viewType = typeView(view);
  const viewName =
    view === "starred"
      ? "Starred"
      : view === "libraries"
        ? "All libraries"
        : viewType
          ? typeById(viewType).name
          : siteView(view)
            ? [
                sites.find((x) => x.key === siteView(view))?.name ?? "Library",
                groupView(view) && groupLabel(groupView(view)!),
              ]
                .filter(Boolean)
                .join(" · ")
            : (current?.name ?? "Starred");
  const exportView = view === "starred" || view === "libraries" ? "all" : view;

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
    setDialog(null);
    setView("starred");
    flash(`Imported ${items.length} from ${result.site}`);
    capturePreviews(items.map((i) => i.url));
  };

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

  const createCollection = (name: string) => {
    const n = name.trim();
    setEdit(null);
    if (!n) return;
    const id = uid();
    update((l) => ({ ...l, collections: [...l.collections, { id, name: n, createdAt: Date.now() }] }));
    setView(id);
  };

  const renameCollection = (id: string, name: string) => {
    setEdit(null);
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
    copy(
      agentText(i, i.site ?? catalog?.libraries.find((l) => l.id === i.library)?.name ?? i.library),
      "Copied for your agent",
    );
  };

  const copyInstall = () => {
    const cmds = visible
      .map((b) => b.install)
      .filter(Boolean)
      .join("\n");
    if (!cmds) return flash("No install commands here");
    copy(cmds, "Install commands copied");
  };

  const run = (fn: () => void) => () => {
    setPalette(false);
    fn();
  };

  return (
    <div data-intro={intro.phase === "done" ? undefined : intro.phase} className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar
        lib={lib}
        view={view}
        setView={setView}
        counts={counts}
        edit={edit}
        setEdit={setEdit}
        createCollection={createCollection}
        renameCollection={renameCollection}
        deleteCollection={(id) => setDialog({ kind: "delete", id })}
        moveTo={dropTo}
        sites={sites}
        reorderSites={(keys) => update((l) => ({ ...l, siteOrder: keys }))}
        openItem={setOpen}
        openId={open?.id}
      />

      <main ref={mainRef} className="min-w-0 flex-1 px-4 pb-24 md:pr-10 md:pl-10">
        <header
          data-chrome
          style={{ "--d": "60ms" } as React.CSSProperties}
          className="sticky top-0 z-10 -mx-4 bg-bg/90 px-4 backdrop-blur-md md:mr-0 md:ml-0 md:px-0"
        >
          <form
            className="flex h-14 items-center gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (barMode === "search" && !normalizeUrl(input)) return;
              add(input);
              setInput("");
            }}
          >
            <div className="flex h-9 w-full items-center gap-2 rounded-lg bg-field pr-2 pl-1 transition-colors focus-within:bg-field-focus">
              <div
                role="radiogroup"
                aria-label="What the bar does"
                className="flex shrink-0 items-center gap-px rounded-md p-0.5"
              >
                {(
                  [
                    ["search", "Search this view", "/", SearchIcon],
                    ["add", "Add a component or library", "+", Plus],
                  ] as const
                ).map(([m, label, key, Icon]) => (
                  <Tip key={m} label={label} shortcut={key}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={barMode === m}
                      aria-label={label}
                      onClick={() => {
                        setBarMode(m);
                        inputRef.current?.focus();
                      }}
                      className={`grid size-7 place-items-center rounded-[5px] transition-[background-color,color,box-shadow] ${
                        barMode === m ? "bg-panel text-fg shadow-sm ring-1 ring-line" : "text-faint hover:text-muted"
                      }`}
                    >
                      <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
                    </button>
                  </Tip>
                ))}
              </div>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && input) {
                    e.preventDefault();
                    e.stopPropagation();
                    setInput("");
                  }
                }}
                placeholder={barMode === "search" ? `Search ${viewName}` : "Paste a component or library link"}
                className="h-full w-full bg-transparent pl-1 outline-none placeholder:text-faint"
                aria-label={barMode === "search" ? "Search components" : "Component or library link"}
                autoComplete="off"
                spellCheck={false}
              />
              {input.trim() && (barMode === "add" || normalizeUrl(input)) && (
                <>
                  <Tip label="Add this link as a component">
                    <button
                      type="submit"
                      className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] whitespace-nowrap text-muted transition hover:text-fg"
                    >
                      Add component <span className="text-faint">↵</span>
                    </button>
                  </Tip>
                  <Tip label="Find every component in this library and sort them by type">
                    <button
                      type="button"
                      onClick={() => {
                        startImport(input);
                        setInput("");
                      }}
                      className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] whitespace-nowrap text-muted transition hover:text-fg"
                    >
                      Import library
                    </button>
                  </Tip>
                </>
              )}
              {barMode === "search" && input && !normalizeUrl(input) && (
                <button
                  type="button"
                  onClick={() => {
                    setInput("");
                    inputRef.current?.focus();
                  }}
                  className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] text-faint transition hover:text-muted"
                  aria-label="Clear search"
                >
                  Clear
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
            <SocialLinks className="hidden md:flex" />
          </form>
        </header>

        {isGallery(view) ? (
          <Gallery
            items={galleryView}
            title={viewName}
            sections={view === "starred" && starredSites.length > 1 && !words.length ? starredSites : undefined}
            onSite={(key) => setView(`site:${key}`)}
            libraries={catalog?.libraries ?? []}
            onOpen={setOpen}
            onStar={toggleStar}
            tools={(i) => {
              const b = i.saved ? lib.bookmarks.find((x) => x.id === i.saved) : undefined;
              return b ? (
                <StarredTools
                  b={b}
                  lib={lib}
                  onMove={(cid) => {
                    moveTo(b.id, cid);
                    flash(`Moved to ${cid ? lib.collections.find((c) => c.id === cid)?.name : "no collection"}`);
                  }}
                  onType={(t) => setType(b.id, t)}
                  onNote={(note) =>
                    update((l) => ({ ...l, bookmarks: l.bookmarks.map((x) => (x.id === b.id ? { ...x, note } : x)) }))
                  }
                  onCopy={() => (b.install ? copy(b.install, "Command copied") : copy(b.url, "Link copied"))}
                />
              ) : null;
            }}
            intro={intro.phase === "wait" && Boolean(catalog)}
            onDeal={intro.dealt}
            onAgent={(text) => copy(text, "Copied for your agent")}
            empty={
              !catalog ? (
                <div />
              ) : words.length ? (
                <p className="pt-16 text-center text-muted">No components match “{input.trim()}”.</p>
              ) : view === "starred" ? (
                <p className="mx-auto max-w-sm pt-20 text-center text-muted">
                  Nothing starred yet. Open a library below and tap the star on a component.
                </p>
              ) : (
                <div />
              )
            }
          />
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
            onAddSite={() => setDialog({ kind: "import", url: "" })}
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
                <Tip label="Clear filter">
                  <button
                    onClick={() => setLibFilter(null)}
                    className="text-[12px] text-muted transition hover:text-fg"
                  >
                    {libFilter} <span className="text-faint">×</span>
                  </button>
                </Tip>
              )}
            </div>

            {ready && lib.bookmarks.length === 0 ? (
              <Empty onAdd={(u) => add(`https://${u}`)} />
            ) : ready && visible.length === 0 ? (
              <p className="pt-16 text-center text-muted">Empty. Paste a link or drag cards here.</p>
            ) : (
              <div data-grid className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 xl:grid-cols-3">
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
                    onUnstar={() => removeBookmark(b.id)}
                    onType={(t) => setType(b.id, t)}
                    onNote={(note) =>
                      update((l) => ({
                        ...l,
                        bookmarks: l.bookmarks.map((x) => (x.id === b.id ? { ...x, note } : x)),
                      }))
                    }
                    onCopy={() => (b.install ? copy(b.install, "Command copied") : copy(b.url, "Link copied"))}
                    onAgent={() => copyForAgent(b)}
                    onOpen={() => setOpen(itemFor(b))}
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
          saved={lib.bookmarks.some((b) => b.id === open.saved || b.ref === open.id || b.url === open.docs)}
          onClose={() => setOpen(null)}
          onStar={() => toggleStar(open)}
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
              { id: "starred", name: "Starred" },
              ...lib.collections,
              ...[...TYPES, OTHER]
                .filter((t) => counts[`type:${t.id}`])
                .map((t) => ({ id: `type:${t.id}`, name: t.name })),
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
                <Command.Item
                  key={name}
                  value={`filter library ${name}`}
                  onSelect={run(() => setLibFilter(name))}
                  className={itemCls}
                >
                  {name}
                  {libFilter === name && <span className="ml-auto text-faint">on</span>}
                </Command.Item>
              ))}
            </Command.Group>
          )}
          <Command.Group heading={`Agent · ${viewName}`}>
            <Command.Item
              onSelect={run(() => copy(exportMarkdown(lib, exportView), "Copied for your agent"))}
              className={itemCls}
            >
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
            <Command.Item onSelect={run(() => setDialog({ kind: "import", url: "" }))} className={itemCls}>
              Import every component from a site
            </Command.Item>
            <Command.Item onSelect={run(() => setEdit({ kind: "new", name: "" }))} className={itemCls}>
              New collection
            </Command.Item>
            {current && (
              <>
                <Command.Item onSelect={run(() => setEdit({ kind: "rename", id: current.id }))} className={itemCls}>
                  Rename “{current.name}”
                </Command.Item>
                <Command.Item onSelect={run(() => setDialog({ kind: "delete", id: current.id }))} className={itemCls}>
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

      {dialog?.kind === "delete" && (
        <ConfirmRemove
          name={lib.collections.find((c) => c.id === dialog.id)?.name ?? "this collection"}
          count={lib.bookmarks.filter((b) => b.collectionId === dialog.id).length}
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            deleteCollection(dialog.id);
            setDialog(null);
          }}
        />
      )}

      {dialog?.kind === "import" && (
        <ImportDialog
          initialUrl={dialog.url}
          savedUrls={new Set(lib.bookmarks.map((b) => b.url))}
          onClose={() => setDialog(null)}
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
type AppDialog = { kind: "import"; url: string } | { kind: "delete"; id: string } | null;
