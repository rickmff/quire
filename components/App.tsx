"use client";

import { Command } from "cmdk";
import SocialLinks from "@/components/SocialLinks";
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
  typeOf,
  uid,
  useLibrary,
} from "@/lib/store";
import { matchLibrary, titleFromUrl } from "@/lib/libraries";
import { OTHER, TYPES, typeById } from "@/lib/types";
import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import ImportDialog, { type ImportChoice } from "@/components/ImportDialog";
import { Agents, Detail, Gallery, Onboarding, Sources } from "@/components/Gallery";
import { type GalleryItem, getStatus, useCatalog, useSyncAvailable } from "@/lib/useCatalog";
import { newSyncKey, pushLibrary, toComponent } from "@/lib/store";

// "starred" = the starred components (saved bookmarks, pasted links too),
// "type:<id>" = one component type across the library, "sites", "agents",
// else a collection id. The old "library" and "all" (Saved) views open Starred.
type View = "starred" | null | string;

const typeView = (v: View) => (typeof v === "string" && v.startsWith("type:") ? v.slice(5) : null);
// "site:<key>" = one library and its own components; "site:<key>|<group>" =
// one category of that library (a sidebar group, see groupItems).
const siteView = (v: View) => (typeof v === "string" && v.startsWith("site:") ? v.slice(5).split("|")[0] : null);
const groupView = (v: View) => (typeof v === "string" && v.startsWith("site:") && v.includes("|") ? v.slice(v.indexOf("|") + 1) : null);
const PAGES = new Set(["starred", "sites", "agents"]);
const isGallery = (v: View) => v === "starred" || typeView(v) !== null || siteView(v) !== null;
// Curated components group by library id; your own links by the site they came from.
const siteKey = (i: { library: string; site?: string }) =>
  i.library !== "mine" ? i.library : `mine-${(i.site ?? "mine").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

const EXAMPLES = [
  "magicui.design/docs/components/marquee",
  "ui.aceternity.com/components/3d-card-effect",
  "ui.shadcn.com/docs/components/command",
];

// The first-load deal plays once per page load, not on later visits to /app
// within the same tab.
let dealtOnce = false;

export default function App() {
  const { lib, ready, update } = useLibrary();
  const [view, setViewRaw] = useState<View>("starred");
  const setView = useCallback((v: View) => setViewRaw(v === "all" || v === "library" ? "starred" : v), []);
  const catalog = useCatalog();
  const syncOk = useSyncAvailable();
  const [open, setOpen] = useState<GalleryItem | null>(null);

  // First load: "deal" hides the chrome while the gallery deals its cards,
  // "show" brings the sidebar and headers in, then the attribute is dropped
  // so later views mount without an entrance.
  const [intro, setIntro] = useState<"deal" | "show" | null>(() => (dealtOnce ? null : "deal"));
  const dealing = useRef(false);
  useEffect(() => {
    dealtOnce = true;
    if (intro === "show") {
      const t = setTimeout(() => setIntro(null), 900);
      return () => clearTimeout(t);
    }
    if (intro !== "deal") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setIntro(null);
    // Nothing to deal (another view, onboarding, slow catalog): show the page.
    const t = setTimeout(() => !dealing.current && setIntro("show"), 1600);
    return () => clearTimeout(t);
  }, [intro]);
  // Switching views from the sidebar: the new title and the cards in view
  // settle in with a short stagger, a quick echo of the first-load deal.
  const mainRef = useRef<HTMLElement>(null);
  const shownView = useRef(view);
  useLayoutEffect(() => {
    if (shownView.current === view) return;
    shownView.current = view;
    const main = mainRef.current;
    if (!main || intro || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const vh = window.innerHeight;
    const els = [...main.querySelectorAll<HTMLElement>("h1, section > button[data-chrome], [data-grid] > *")].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.top < vh && r.bottom > 0;
    });
    els.forEach((el, i) =>
      el.animate(
        [{ opacity: 0, transform: "translateY(8px) scale(.985)", filter: "blur(2px)" }, { opacity: 1, transform: "none", filter: "none" }],
        { duration: 360, delay: Math.min(i, 10) * 28, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" },
      ),
    );
  }, [view, intro]);

  // The onboarding has no cards to deal.
  const onboarding = isGallery(view) && ready && catalog && !lib.mode && lib.bookmarks.length === 0;
  useEffect(() => {
    if (onboarding && intro === "deal") setIntro("show");
  }, [onboarding, intro]);
  const onDeal = useCallback((ms: number) => {
    dealing.current = true;
    setTimeout(() => setIntro("show"), ms);
  }, []);

  // Quire registers no service worker. One left on this origin by another app
  // (localhost:3000 is shared by many projects) can serve stale scripts, so drop it.
  useEffect(() => {
    navigator.serviceWorker
      ?.getRegistrations()
      .then((rs) => rs.forEach((r) => r.unregister()))
      .catch(() => {});
  }, []);
  const [input, setInput] = useState("");
  // The top bar's input either searches the current view or adds a link
  // (a component or a whole library). Search is the default.
  const [barMode, setBarMode] = useState<"search" | "add">("search");
  const query = barMode === "search" ? input.trim().toLowerCase() : "";
  const words = useMemo(() => query.split(/\s+/).filter(Boolean), [query]);
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

  const removeBookmark = (id: string, msg = "Deleted") => {
    const idx = lib.bookmarks.findIndex((x) => x.id === id);
    const gone = lib.bookmarks[idx];
    if (!gone) return;
    update((l) => ({ ...l, bookmarks: l.bookmarks.filter((x) => x.id !== id) }));
    flash(msg, () => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const g = groupView(view);
    const inView =
      s && g
        ? (groupItems(galleryItems.filter((i) => siteKey(i) === s)).find((x) => x.key === g)?.items ?? [])
        : s
          ? galleryItems.filter((i) => siteKey(i) === s)
          : t
            ? galleryItems.filter((i) => i.type === t)
            : galleryItems.filter((i) => i.saved);
    if (!words.length) return inView;
    return inView.filter((i) => {
      const hay = `${i.title} ${i.name} ${i.description ?? ""} ${i.category ?? ""} ${i.site ?? i.library} ${typeById(i.type).name} ${i.tech.join(" ")}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [galleryItems, view, words]);

  // Library first: every site in the library, with its own components.
  const sites = useMemo(() => {
    const m = new Map<string, { key: string; name: string; items: GalleryItem[] }>();
    for (const i of galleryItems) {
      const key = siteKey(i);
      if (!m.has(key)) m.set(key, { key, name: i.site ?? catalog?.libraries.find((l) => l.id === i.library)?.name ?? i.library, items: [] });
      m.get(key)!.items.push(i);
    }
    // The user's own order first (dragged in the sidebar), the rest by name.
    const rank = new Map((lib.siteOrder ?? []).map((k, i) => [k, i]));
    const at = (k: string) => rank.get(k) ?? Infinity;
    return [...m.values()].sort((a, b) => at(a.key) - at(b.key) || a.name.localeCompare(b.name));
  }, [galleryItems, catalog, lib.siteOrder]);

  // Starred: only the components with a saved bookmark, grouped like the sites.
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

  // The star (on a card or in the drawer) is the only way to save: it saves
  // the component, or removes the saved copy. Looks the copy up live, since
  // the open drawer holds a snapshot of the item.
  const toggleStar = (c: GalleryItem) => {
    const id = lib.bookmarks.find((b) => b.id === c.saved || b.ref === c.id || b.url === c.docs)?.id;
    if (id) removeBookmark(id, "Removed from Starred");
    else saveFromCatalog(c);
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
    setView(`site:${site.id}`);
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
    c.starred = galleryItems.filter((i) => i.saved).length;
    return c;
  }, [lib.bookmarks, galleryItems]);

  const current = typeof view === "string" && view !== "all" ? lib.collections.find((c) => c.id === view) : undefined;
  const viewType = typeView(view);
  const viewName =
    view === "starred"
      ? "Starred"
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
  // Starred holds every saved bookmark, which the store calls "all".
  const exportView = view === "starred" ? "all" : view;

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
    setView("starred");
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
    if (view === id) setView("starred");
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
    <div data-intro={intro ?? undefined} className="flex min-h-dvh flex-col md:flex-row">
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
        reorderSites={(keys) => update((l) => ({ ...l, siteOrder: keys }))}
        openItem={setOpen}
        openId={open?.id}
      />

      <main ref={mainRef} className="min-w-0 flex-1 px-4 pb-24 md:pr-10 md:pl-2">
        <header data-chrome style={{ "--d": "60ms" } as React.CSSProperties} className="sticky top-0 z-10 -mx-4 bg-bg/90 px-4 backdrop-blur-md md:mr-0 md:ml-0 md:px-0">
          <form
            className="flex h-14 items-center gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              // Search filters as you type; Enter adds only a link.
              if (barMode === "search" && !normalizeUrl(input)) return;
              add(input);
              setInput("");
            }}
          >
            <div className="flex h-9 w-full items-center gap-2 rounded-lg bg-field pr-2 pl-1 transition-colors focus-within:bg-field-focus">
            <div role="radiogroup" aria-label="What the bar does" className="flex shrink-0 items-center gap-px rounded-md p-0.5">
              {(
                [
                  ["search", "Search this view", "/", SearchIcon],
                  ["add", "Add a component or library", "+", Plus],
                ] as const
              ).map(([m, label, key, Icon]) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={barMode === m}
                  aria-label={label}
                  title={`${label}  ${key}`}
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
              ))}
            </div>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // Escape clears first, then leaves the field.
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
                <button
                  type="submit"
                  title="Add this link as a component"
                  className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] whitespace-nowrap text-muted transition hover:text-fg"
                >
                  Add component <span className="text-faint">↵</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    startImport(input);
                    setInput("");
                  }}
                  title="Find every component on this library and sort them by type"
                  className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] whitespace-nowrap text-muted transition hover:text-fg"
                >
                  Import library
                </button>
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
          ready && catalog && !lib.mode && lib.bookmarks.length === 0 ? (
            <Onboarding libraries={catalog.libraries} total={catalog.components.length} onChoose={choose} />
          ) : (
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
                    onDelete={() => removeBookmark(b.id)}
                    onType={(t) => setType(b.id, t)}
                    onNote={(note) => update((l) => ({ ...l, bookmarks: l.bookmarks.map((x) => (x.id === b.id ? { ...x, note } : x)) }))}
                    onCopy={() => (b.install ? copy(b.install, "Command copied") : copy(b.url, "Link copied"))}
                  />
                ) : null;
              }}
              intro={intro === "deal"}
              onDeal={onDeal}
              empty={
                words.length ? (
                  <p className="pt-16 text-center text-muted">No components match “{input.trim()}”.</p>
                ) : view === "starred" ? (
                  <p className="mx-auto max-w-sm pt-20 text-center text-muted">
                    Nothing starred yet. Open a library below and tap the star on a component.
                  </p>
                ) : (
                  <div className="mx-auto max-w-sm pt-20 text-center">
                    <p>Your library is empty.</p>
                    <p className="mt-1 text-muted">Paste the link of a component library above, or turn on curated sites.</p>
                    <button onClick={() => setView("sites")} className="mt-5 text-[12px] text-muted transition hover:text-fg">
                      Choose sites
                    </button>
                  </div>
                )
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
  reorderSites: (keys: string[]) => void;
  openItem: (item: GalleryItem) => void;
  openId?: string;
}) {
  const { lib, view, setView, counts, newCol, setNewCol, sites, openItem, openId } = props;
  const activeSite = siteView(view);
  const { drag, blockRef, onPointerDown, onClickCapture } = useSiteDrag(sites.map((x) => x.key), props.reorderSites);

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
    <aside data-chrome className="md:sticky md:top-0 md:h-dvh md:w-56 md:shrink-0">
      <div className="flex h-full flex-col px-3 pt-4 md:px-4">
        <div className="flex h-10 items-center px-2 md:h-7 md:pl-[34px]">
          <Link href="/" aria-label="quire home" className="rounded-sm">
            <Wordmark className="block h-6 w-auto text-fg md:h-[26px]" />
          </Link>
        </div>

        <nav
          ref={ruler}
          onMouseMove={grow}
          onMouseLeave={settle}
          className="ruler -mx-1 mt-2 flex gap-0.5 overflow-x-auto pb-2 md:mx-0 md:mt-2 md:min-h-0 md:flex-1 md:flex-col md:gap-0 md:overflow-y-auto"
        >
          {/* First block: rows spaced like the gallery title and its chips row
              (38px apart), and shifted so they share those lines. */}
          <div className="contents md:flex md:flex-col md:gap-2.5 md:pt-1">
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
              data-row
              onClick={() => setNewCol("")}
              className="group flex h-7 shrink-0 items-center gap-2 rounded-md px-2 text-left whitespace-nowrap text-faint transition hover:text-muted md:rounded-none md:px-0"
            >
              <span className="hidden w-[26px] shrink-0 md:block">
                <span data-tick className="block h-px bg-faint group-hover:bg-muted" />
              </span>
              New collection
            </button>
          )}
          <NavItem id="starred" name="Starred" count={counts.starred ?? 0} {...props} />
          </div>
          {lib.collections.length > 0 && <div className="hidden h-3 md:block" />}
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
          {sites.length > 0 && (
            <>
              <div className="hidden h-4 md:block" />
              <span className="hidden pb-1 pl-[34px] text-[11px] text-faint md:block">Libraries</span>
              {sites.map((x, i) => {
                const dragging = drag?.key === x.key;
                return (
                  <div
                    key={x.key}
                    ref={blockRef(x.key)}
                    onPointerDown={(e) => onPointerDown(e, x.key)}
                    onClickCapture={onClickCapture}
                    style={drag ? { transform: `translateY(${dragging ? drag.dy : shiftFor(drag, i)}px)` } : undefined}
                    className={`contents md:relative md:flex md:shrink-0 md:flex-col ${
                      !drag ? "" : dragging ? `z-10 ${drag.settling ? "transition-transform duration-150 ease-out" : ""}` : "transition-transform duration-200 ease-out"
                    }`}
                  >
                    {dragging && (
                      <span
                        aria-hidden
                        className={`pointer-events-none absolute -inset-x-1.5 top-0 -z-10 hidden h-7 rounded-md bg-hover transition-[opacity,box-shadow] duration-150 md:block ${
                          drag.settling ? "opacity-0" : "shadow-[0_8px_18px_-8px_rgb(0_0_0/0.45)]"
                        }`}
                      />
                    )}
                    <NavItem id={`site:${x.key}`} name={x.name} count={x.items.length} {...props} />
                    <Collapse open={activeSite === x.key} className="hidden md:grid">
                      <SiteGroups
                        items={x.items}
                        openItem={openItem}
                        openId={openId}
                        active={activeSite === x.key ? groupView(view) : null}
                        onGroup={(g) => setView(g ? `site:${x.key}|${g}` : `site:${x.key}`)}
                      />
                    </Collapse>
                  </div>
                );
              })}
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

type SiteDrag = { key: string; from: number; to: number; dy: number; heights: number[]; settling?: boolean };

// How far a library that is not being dragged slides to open the gap.
function shiftFor(d: SiteDrag, i: number) {
  const h = d.heights[d.from];
  if (d.from < d.to && i > d.from && i <= d.to) return -h;
  if (d.from > d.to && i >= d.to && i < d.from) return h;
  return 0;
}

// Drag a library row up or down to change the order. A press that does not
// move stays a plain click; a drag swallows the click that follows it.
function useSiteDrag(keys: string[], onReorder: (keys: string[]) => void) {
  const [drag, setDrag] = useState<SiteDrag | null>(null);
  const blocks = useRef(new Map<string, HTMLDivElement>());
  const swallow = useRef(false);
  const busy = useRef(false);
  const latest = useRef({ keys, onReorder });
  latest.current = { keys, onReorder };

  const blockRef = (key: string) => (el: HTMLDivElement | null) => {
    if (el) blocks.current.set(key, el);
    else blocks.current.delete(key);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>, key: string) => {
    if (e.button !== 0 || busy.current || !window.matchMedia("(min-width: 768px)").matches) return;
    // Only the library row is a handle, not the groups under it.
    if ((e.target as HTMLElement).closest("button")?.parentElement !== e.currentTarget) return;
    const order = latest.current.keys;
    const from = order.indexOf(key);
    const rects = order.map((k) => blocks.current.get(k)?.getBoundingClientRect());
    if (from < 0 || order.length < 2 || rects.some((r) => !r)) return;
    const heights = rects.map((r) => r!.height);
    // Measured on the library row itself (28px), not its open groups, so an
    // expanded library swaps as soon as its row passes a neighbour's.
    const centers = rects.map((r) => r!.top + Math.min(r!.height, 28) / 2);
    const y0 = e.clientY;
    let current: SiteDrag | null = null;

    const move = (ev: PointerEvent) => {
      const dy = ev.clientY - y0;
      if (!current && Math.abs(dy) < 4) return;
      if (!current) {
        busy.current = true;
        document.documentElement.classList.add("dragging-site");
      }
      ev.preventDefault();
      // The dragged row's centre decides the slot it would drop into.
      const c = centers[from] + dy;
      let to = 0;
      for (let i = 0; i < centers.length; i++) if (i !== from && centers[i] < c) to++;
      current = { key, from, to, dy, heights };
      setDrag(current);
    };
    const end = (cancel: boolean) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("dragging-site");
      if (!current) return;
      swallow.current = true;
      setTimeout(() => (swallow.current = false), 0);
      const d = current;
      const to = cancel ? d.from : d.to;
      // Glide into the open slot, then commit the new order.
      let slot = 0;
      if (to > d.from) for (let i = d.from + 1; i <= to; i++) slot += heights[i];
      else for (let i = to; i < d.from; i++) slot -= heights[i];
      setDrag({ ...d, to, dy: slot, settling: true });
      setTimeout(() => {
        if (to !== d.from) {
          const next = [...latest.current.keys];
          const [k] = next.splice(d.from, 1);
          next.splice(to, 0, k);
          latest.current.onReorder(next);
        }
        setDrag(null);
        busy.current = false;
      }, 160);
    };
    const up = () => end(false);
    const onCancel = () => end(true);
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") end(true);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey);
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (!swallow.current) return;
    e.preventDefault();
    e.stopPropagation();
  };

  return { drag, blockRef, onPointerDown, onClickCapture };
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

// Opens and closes its rows with a quick height and fade. Closed rows stay
// mounted so they can animate out, and inert so they take no focus.
function Collapse({ open, className = "grid", children }: { open: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div
      inert={!open}
      className={`${className} transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="flex min-h-0 flex-col overflow-hidden">{children}</div>
    </div>
  );
}

// The sidebar name of a group key from groupItems ("Input", "Effect/text-effect").
const groupLabel = (key: string) => {
  const [family, type] = key.split("/");
  return type ? (TYPE_LABEL[type] ?? typeById(type).name) : (FAMILY_LABEL[family] ?? family);
};

function SiteGroups({
  items,
  openItem,
  openId,
  active,
  onGroup,
}: {
  items: GalleryItem[];
  openItem: (item: GalleryItem) => void;
  openId?: string;
  // The category the gallery is filtered to, if any.
  active: string | null;
  onGroup: (key: string | null) => void;
}) {
  const groups = useMemo(() => groupItems(items), [items]);
  // One group open at a time, like an accordion.
  const [open, setOpen] = useState<string | null>(null);
  // The group that holds the open component, or the filtered category, opens with it.
  useEffect(() => {
    const g = groups.find((g) => g.items.some((i) => i.id === openId));
    if (g) setOpen(g.key);
  }, [groups, openId]);
  useEffect(() => {
    if (active) setOpen(active);
  }, [active]);
  // A click filters the gallery to the category and opens it; a click on the
  // filtered category goes back to the whole library and closes it.
  const toggle = (k: string) => {
    const off = active === k;
    setOpen(off ? null : k);
    onGroup(off ? null : k);
  };

  return (
    <div className="contents">
      {groups.map((g) => {
        const expanded = open === g.key;
        return (
          <div key={g.key} className="contents">
            <button
              data-row
              aria-expanded={expanded}
              aria-pressed={active === g.key}
              onClick={() => toggle(g.key)}
              className={`group flex h-6 shrink-0 items-center gap-2 pl-3 text-left text-[12px] whitespace-nowrap transition ${
                active === g.key ? "text-accent" : "text-muted hover:text-fg"
              }`}
            >
              <span className="flex w-[26px] shrink-0 items-center pl-[13px]">
                <svg
                  viewBox="0 0 8 8"
                  className={`size-2 transition-transform duration-200 motion-reduce:transition-none ${expanded ? "rotate-90" : ""}`}
                  aria-hidden
                >
                  <path d="M2.5 1.5 5.5 4l-3 2.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="min-w-0 flex-1 truncate">{g.name}</span>
              <span className="text-[11px] tabular-nums">{g.items.length}</span>
            </button>
            <Collapse open={expanded}>
              {g.items.map((i) => (
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
            </Collapse>
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
          <button onClick={onCancel} className="btn btn-sm btn-secondary">
            Cancel
          </button>
          <button autoFocus onClick={onConfirm} className="btn btn-sm btn-primary">
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
  const droppable = !(typeof id === "string" && (PAGES.has(id) || id.startsWith("site:")));
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

        <CardTools b={b} lib={lib} onMove={onMove} onDelete={onDelete} onType={onType} onNote={() => setEditing(true)} onCopy={onCopy} className="top-2 right-2" />
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

// The hover toolbar of a saved card: copy, note, collection, type, delete.
function CardTools({
  b,
  lib,
  onMove,
  onDelete,
  onType,
  onNote,
  onCopy,
  className,
}: {
  b: Bookmark;
  lib: Library;
  onMove: (cid: string | null) => void;
  onDelete: () => void;
  onType: (type: string) => void;
  onNote: () => void;
  onCopy: () => void;
  className: string;
}) {
  return (
    <div className={`absolute ${className} flex items-center gap-0.5 rounded-md bg-panel/90 p-0.5 opacity-0 shadow-sm ring-1 ring-line backdrop-blur transition group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100`}>
      <IconBtn label={b.install ? "Copy install command" : "Copy link"} onClick={onCopy} data="copy">
        <CopyIcon />
      </IconBtn>
      <IconBtn label="Note for your agent" onClick={onNote}>
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
  );
}

// The same toolbar on a starred gallery card, beside the star. Its clicks stay
// off the card, and the note opens in a small field under the toolbar.
function StarredTools({
  b,
  lib,
  onMove,
  onDelete,
  onType,
  onNote,
  onCopy,
}: {
  b: Bookmark;
  lib: Library;
  onMove: (cid: string | null) => void;
  onDelete: () => void;
  onType: (type: string) => void;
  onNote: (note: string) => void;
  onCopy: () => void;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} className="contents">
      <CardTools b={b} lib={lib} onMove={onMove} onDelete={onDelete} onType={onType} onNote={() => setEditing(true)} onCopy={onCopy} className="top-2 right-11 z-10" />
      {editing && (
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
          className="absolute top-11 right-2 left-2 z-10 resize-none rounded-md bg-panel px-2 py-1.5 text-[12px] shadow-sm ring-1 ring-line outline-none placeholder:text-faint"
        />
      )}
    </div>
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
