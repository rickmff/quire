"use client";

import { Command } from "cmdk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type Bookmark,
  type Library,
  exportMarkdown,
  fetchMeta,
  normalizeUrl,
  uid,
  useLibrary,
} from "@/lib/store";
import { matchLibrary, titleFromUrl } from "@/lib/libraries";
import Wordmark from "@/components/Wordmark";

type View = "all" | null | string; // null = Inbox

const EXAMPLES = [
  "magicui.design/docs/components/marquee",
  "ui.aceternity.com/components/3d-card-effect",
  "ui.shadcn.com/docs/components/command",
];

export default function App() {
  const { lib, ready, update } = useLibrary();
  const [view, setView] = useState<View>("all");
  const [input, setInput] = useState("");
  const [palette, setPalette] = useState(false);
  const [toast, setToast] = useState<{ msg: string; undo?: () => void } | null>(null);
  const [newCol, setNewCol] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
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
      const draft: Bookmark = {
        id,
        url,
        title: titleFromUrl(url),
        library: m.library,
        install: m.install,
        tags: [],
        collectionId: view === "all" ? null : view,
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
      } catch {
        /* keep the URL-only card */
      }
    },
    [lib.bookmarks, update, view, flash],
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

  const visible = useMemo(() => {
    const inView = view === "all" ? lib.bookmarks : lib.bookmarks.filter((b) => b.collectionId === view);
    return libFilter ? inView.filter((b) => b.library === libFilter) : inView;
  }, [lib.bookmarks, view, libFilter]);

  const libraries = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of lib.bookmarks) m.set(b.library, (m.get(b.library) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [lib.bookmarks]);

  useEffect(() => setSel(-1), [view, libFilter]);

  // Keyboard: arrows or j/k to move, Enter to open, c to copy, Backspace to delete.
  const navRef = useRef<{ visible: Bookmark[]; sel: number }>({ visible: [], sel: -1 });
  navRef.current = { visible, sel };
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
    return c;
  }, [lib.bookmarks]);

  const current = typeof view === "string" && view !== "all" ? lib.collections.find((c) => c.id === view) : undefined;
  const viewName = view === "all" ? "All" : view === null ? "Inbox" : (current?.name ?? "All");
  const exportView = view === "all" ? "all" : view;

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

  const deleteCollection = (id: string) => {
    update((l) => ({
      ...l,
      collections: l.collections.filter((c) => c.id !== id),
      bookmarks: l.bookmarks.map((b) => (b.collectionId === id ? { ...b, collectionId: null } : b)),
    }));
    setView("all");
    flash("Collection removed");
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
        moveTo={moveTo}
        openPalette={() => setPalette(true)}
      />

      <main className="min-w-0 flex-1 px-4 pb-24 md:pr-10 md:pl-2">
        <header className="sticky top-0 z-10 -mx-4 bg-bg/90 px-4 backdrop-blur-md md:mr-0 md:ml-0 md:px-0">
          <form
            className="flex h-14 items-center gap-3 border-b border-line"
            onSubmit={(e) => {
              e.preventDefault();
              add(input);
              setInput("");
            }}
          >
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
            <button
              type="button"
              onClick={() => setPalette(true)}
              className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] text-faint transition hover:text-muted"
              aria-label="Open command menu"
            >
              ⌘K
            </button>
          </form>
        </header>

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
                  flash(`Moved to ${cid ? lib.collections.find((c) => c.id === cid)?.name : "Inbox"}`);
                }}
                onDelete={() => removeBookmark(b.id)}
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
      </main>

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
          className="h-12 w-full border-b border-line bg-transparent px-4 outline-none placeholder:text-faint"
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
            {[{ id: "all", name: "All" }, { id: "inbox", name: "Inbox" }, ...lib.collections].map((c) => (
              <Command.Item
                key={c.id}
                value={`go ${c.name} ${c.id}`}
                onSelect={run(() => setView(c.id === "all" ? "all" : c.id === "inbox" ? null : c.id))}
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
            <Command.Item onSelect={run(copyInstall)} className={itemCls}>
              Copy install commands
            </Command.Item>
          </Command.Group>
          <Command.Group heading="Library">
            <Command.Item onSelect={run(() => setNewCol(""))} className={itemCls}>
              New collection
            </Command.Item>
            {current && (
              <>
                <Command.Item onSelect={run(() => setRenaming(current.id))} className={itemCls}>
                  Rename “{current.name}”
                </Command.Item>
                <Command.Item onSelect={run(() => deleteCollection(current.id))} className={itemCls}>
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
  moveTo: (bookmarkId: string, collectionId: string | null) => void;
  openPalette: () => void;
}) {
  const { lib, view, setView, counts, newCol, setNewCol } = props;
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const bookmarklet = origin
    ? `javascript:(()=>{window.open('${origin}/add?url='+encodeURIComponent(location.href),'quire','width=380,height=240')})()`
    : "#";

  return (
    <aside className="md:sticky md:top-0 md:h-dvh md:w-56 md:shrink-0">
      <div className="flex h-full flex-col px-3 pt-4 md:px-4">
        <div className="flex h-10 items-center px-2 md:h-6">
          <Wordmark className="h-[15px] w-auto text-fg" />
        </div>

        <nav className="-mx-1 mt-2 flex gap-0.5 overflow-x-auto pb-2 md:mx-0 md:mt-6 md:flex-col md:overflow-visible md:pb-0">
          <NavItem id="all" name="All" count={lib.bookmarks.length} {...props} />
          <NavItem id={null} name="Inbox" count={counts.inbox ?? 0} {...props} />
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
                className="h-7 shrink-0 rounded-md bg-hover px-2 outline-none"
              />
            ) : (
              <NavItem key={c.id} id={c.id} name={c.name} count={counts[c.id] ?? 0} onRename={() => props.setRenaming(c.id)} {...props} />
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
              className="h-7 shrink-0 rounded-md bg-hover px-2 outline-none placeholder:text-faint"
            />
          ) : (
            <button
              onClick={() => setNewCol("")}
              className="h-7 shrink-0 rounded-md px-2 text-left whitespace-nowrap text-faint transition hover:text-muted"
            >
              New collection
            </button>
          )}
        </nav>

        <div className="mt-auto hidden flex-col gap-0.5 pb-5 whitespace-nowrap text-[11px] md:flex">
          <a
            href={bookmarklet}
            onClick={(e) => e.preventDefault()}
            title="Drag to your bookmarks bar, then click it on any page to save it"
            className="rounded-md px-2 py-1 text-faint transition hover:text-muted"
          >
            Save button <span className="text-faint">· drag to bar</span>
          </a>
          <button onClick={props.openPalette} className="rounded-md px-2 py-1 text-left text-faint transition hover:text-muted">
            Commands <span>⌘K</span>
          </button>
          <span className="px-2 py-1 text-faint">Open source · MIT</span>
        </div>
      </div>
    </aside>
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
}: {
  id: View;
  name: string;
  count: number;
  view: View;
  setView: (v: View) => void;
  moveTo: (bookmarkId: string, collectionId: string | null) => void;
  onRename?: () => void;
}) {
  const [over, setOver] = useState(false);
  const active = view === id;
  const droppable = id !== "all";
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
      className={`group flex h-7 shrink-0 items-center justify-between gap-4 rounded-md px-2 text-left whitespace-nowrap transition ${
        active ? "bg-hover text-fg" : "text-muted hover:text-fg"
      } ${over ? "bg-hover text-fg" : ""}`}
    >
      <span className="truncate">{name}</span>
      <span className={`text-[11px] tabular-nums text-faint transition ${active ? "" : "opacity-0 group-hover:opacity-100"}`}>
        {count || ""}
      </span>
    </button>
  );
}

function Card({
  b,
  lib,
  selected,
  onMove,
  onDelete,
  onNote,
  onCopy,
}: {
  b: Bookmark;
  lib: Library;
  selected: boolean;
  onMove: (cid: string | null) => void;
  onDelete: () => void;
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
              <option value="">Inbox</option>
              {lib.collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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
            className="mt-1.5 w-full resize-none rounded-md bg-hover px-2 py-1.5 text-[12px] outline-none placeholder:text-faint"
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
