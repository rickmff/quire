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

type View = "all" | null | string; // null = Inbox

const EXAMPLES = [
  "https://magicui.design/docs/components/marquee",
  "https://ui.aceternity.com/components/3d-card-effect",
  "https://ui.shadcn.com/docs/components/command",
];

export default function App() {
  const { lib, ready, update } = useLibrary();
  const [view, setView] = useState<View>("all");
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState("");
  const [palette, setPalette] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [newCol, setNewCol] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout((flash as unknown as { t?: number }).t);
    (flash as unknown as { t?: number }).t = window.setTimeout(() => setToast(null), 1800);
  }, []);

  const add = useCallback(
    async (raw: string) => {
      const url = normalizeUrl(raw);
      if (!url) return flash("That doesn't look like a link");
      if (lib.bookmarks.some((b) => b.url === url)) return flash("Already saved");
      const id = uid();
      const m = matchLibrary(url);
      const collectionId = view === "all" ? null : view;
      const draft: Bookmark = {
        id,
        url,
        title: titleFromUrl(url),
        library: m.library,
        install: m.install,
        tags: [],
        collectionId,
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

  // Global shortcuts and paste-to-save.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest("input, textarea, select");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
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
    const base =
      view === "all" ? lib.bookmarks : lib.bookmarks.filter((b) => b.collectionId === view);
    const q = filter.trim().toLowerCase();
    if (!q) return base;
    return base.filter((b) =>
      [b.title, b.library, b.description, b.url, b.note, ...b.tags]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(q)),
    );
  }, [lib.bookmarks, view, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { inbox: 0 };
    for (const b of lib.bookmarks) {
      const k = b.collectionId ?? "inbox";
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [lib.bookmarks]);

  const viewName =
    view === "all" ? "All" : view === null ? "Inbox" : lib.collections.find((c) => c.id === view)?.name ?? "All";

  const createCollection = (name: string) => {
    const n = name.trim();
    if (!n) return setNewCol(null);
    const id = uid();
    update((l) => ({ ...l, collections: [...l.collections, { id, name: n, createdAt: Date.now() }] }));
    setNewCol(null);
    setView(id);
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

  const exportView = view === "all" ? "all" : view;

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
        moveTo={moveTo}
        onDeleteCollection={(id) => {
          update((l) => ({
            ...l,
            collections: l.collections.filter((c) => c.id !== id),
            bookmarks: l.bookmarks.map((b) => (b.collectionId === id ? { ...b, collectionId: null } : b)),
          }));
          setView("all");
        }}
        onCopyMarkdown={() => copy(exportMarkdown(lib, exportView), "Copied for your agent")}
        onCopyInstall={() => {
          const cmds = visible.map((b) => b.install).filter(Boolean).join("\n");
          if (!cmds) return flash("No install commands here");
          copy(cmds, "Install commands copied");
        }}
        onDownload={() => download(lib)}
        onImport={(data) => {
          update((l) => mergeLibrary(l, data));
          flash("Imported");
        }}
      />

      <main className="flex-1 px-4 pb-16 md:px-8">
        <header className="sticky top-0 z-10 -mx-4 flex items-center gap-2 bg-bg/85 px-4 py-4 backdrop-blur md:-mx-8 md:px-8">
          <form
            className="flex flex-1 items-center gap-2 rounded-xl border border-line bg-panel px-3 focus-within:border-fg/40"
            onSubmit={(e) => {
              e.preventDefault();
              add(input);
              setInput("");
            }}
          >
            <span className="text-muted">+</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste a component link and press Enter"
              className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted"
              aria-label="Component link"
            />
            <kbd className="hidden rounded border border-line px-1.5 text-[11px] text-muted sm:block">/</kbd>
          </form>
          <button
            onClick={() => setPalette(true)}
            className="flex h-11 items-center gap-2 rounded-xl border border-line bg-panel px-3 text-sm text-muted hover:text-fg"
            aria-label="Search"
          >
            <span className="hidden sm:inline">Search</span>
            <kbd className="rounded border border-line px-1.5 text-[11px]">⌘K</kbd>
          </button>
        </header>

        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h1 className="text-lg font-semibold tracking-tight">
            {viewName} <span className="font-normal text-muted">{visible.length}</span>
          </h1>
          {lib.bookmarks.length > 0 && (
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter"
              className="h-8 w-36 rounded-lg border border-line bg-transparent px-2 text-sm outline-none placeholder:text-muted focus:border-fg/40"
            />
          )}
        </div>

        {ready && lib.bookmarks.length === 0 ? (
          <Empty onAdd={add} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visible.map((b) => (
              <Card
                key={b.id}
                b={b}
                lib={lib}
                onMove={(cid) => moveTo(b.id, cid)}
                onDelete={() => update((l) => ({ ...l, bookmarks: l.bookmarks.filter((x) => x.id !== b.id) }))}
                onNote={(note) =>
                  update((l) => ({
                    ...l,
                    bookmarks: l.bookmarks.map((x) => (x.id === b.id ? { ...x, note } : x)),
                  }))
                }
                onCopy={() =>
                  b.install ? copy(b.install, "Install command copied") : copy(b.url, "Link copied")
                }
              />
            ))}
          </div>
        )}
      </main>

      <Command.Dialog open={palette} onOpenChange={setPalette} label="Search" className="overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl">
        <Command.Input
          autoFocus
          placeholder="Search bookmarks, collections, actions"
          className="h-12 w-full border-b border-line bg-transparent px-4 text-sm outline-none placeholder:text-muted"
        />
        <Command.List className="max-h-[50vh] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-muted">Nothing found.</Command.Empty>
          <Command.Group heading="Bookmarks">
            {lib.bookmarks.map((b) => (
              <Command.Item
                key={b.id}
                value={`${b.title} ${b.library} ${b.tags.join(" ")} ${b.id}`}
                onSelect={() => {
                  window.open(b.url, "_blank", "noopener");
                  setPalette(false);
                }}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm"
              >
                <span className="truncate">{b.title}</span>
                <span className="shrink-0 text-xs text-muted">{b.library}</span>
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading="Collections">
            {[{ id: "all", name: "All" }, { id: "inbox", name: "Inbox" }, ...lib.collections].map((c) => (
              <Command.Item
                key={c.id}
                value={`go ${c.name} ${c.id}`}
                onSelect={() => {
                  setView(c.id === "all" ? "all" : c.id === "inbox" ? null : c.id);
                  setPalette(false);
                }}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm"
              >
                Go to {c.name}
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading="Actions">
            <Command.Item
              onSelect={() => {
                setPalette(false);
                setNewCol("");
              }}
              className="cursor-pointer rounded-lg px-3 py-2 text-sm"
            >
              New collection
            </Command.Item>
            <Command.Item
              onSelect={() => {
                setPalette(false);
                copy(exportMarkdown(lib, exportView), "Copied for your agent");
              }}
              className="cursor-pointer rounded-lg px-3 py-2 text-sm"
            >
              Copy “{viewName}” for an AI agent
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command.Dialog>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-fg px-4 py-2 text-sm text-bg shadow-lg">
          {toast}
        </div>
      )}
    </div>
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
  moveTo: (bookmarkId: string, collectionId: string | null) => void;
  onDeleteCollection: (id: string) => void;
  onCopyMarkdown: () => void;
  onCopyInstall: () => void;
  onDownload: () => void;
  onImport: (data: Library) => void;
}) {
  const { lib, view, setView, counts, newCol, setNewCol } = props;
  const fileRef = useRef<HTMLInputElement>(null);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const bookmarklet = origin
    ? `javascript:(()=>{window.open('${origin}/add?url='+encodeURIComponent(location.href),'designlib','width=420,height=320')})()`
    : "#";

  const Item = ({ id, name, count }: { id: View; name: string; count: number }) => {
    const [over, setOver] = useState(false);
    const active = view === id;
    return (
      <div className="group relative">
        <button
          onClick={() => setView(id)}
          onDragOver={(e) => {
            if (id === "all") return;
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            setOver(false);
            const bid = e.dataTransfer.getData("text/bookmark-id");
            if (bid && id !== "all") props.moveTo(bid, id);
          }}
          className={`flex w-full shrink-0 items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-sm whitespace-nowrap ${
            active ? "bg-fg/[0.07] font-medium" : "text-muted hover:text-fg"
          } ${over ? "ring-1 ring-fg/40" : ""}`}
        >
          <span className="truncate">{name}</span>
          <span className="text-xs text-muted">{count}</span>
        </button>
      </div>
    );
  };

  return (
    <aside className="border-line md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:border-r">
      <div className="flex h-full flex-col gap-6 overflow-y-auto px-4 py-4 md:py-5">
        <div className="flex items-center gap-2 px-1">
          <div className="grid size-6 place-items-center rounded-md bg-fg text-[11px] font-bold text-bg">D</div>
          <span className="text-sm font-semibold tracking-tight">Design Lib</span>
        </div>

        <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          <Item id="all" name="All" count={lib.bookmarks.length} />
          <Item id={null} name="Inbox" count={counts.inbox ?? 0} />
          <div className="hidden px-2.5 pt-4 pb-1 text-[11px] tracking-wide text-muted uppercase md:block">
            Collections
          </div>
          {lib.collections.map((c) => (
            <Item key={c.id} id={c.id} name={c.name} count={counts[c.id] ?? 0} />
          ))}
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
              placeholder="Collection name"
              className="h-8 shrink-0 rounded-lg border border-line bg-transparent px-2.5 text-sm outline-none"
            />
          ) : (
            <button
              onClick={() => setNewCol("")}
              className="shrink-0 rounded-lg px-2.5 py-1.5 text-left text-sm whitespace-nowrap text-muted hover:text-fg"
            >
              + New collection
            </button>
          )}
        </nav>

        <div className="mt-auto hidden flex-col gap-1 text-sm md:flex">
          <div className="px-2.5 pb-1 text-[11px] tracking-wide text-muted uppercase">For your agent</div>
          <SideAction onClick={props.onCopyMarkdown}>Copy as Markdown</SideAction>
          <SideAction onClick={props.onCopyInstall}>Copy install commands</SideAction>
          <SideAction onClick={props.onDownload}>Download JSON</SideAction>
          <SideAction onClick={() => fileRef.current?.click()}>Import JSON</SideAction>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                props.onImport(JSON.parse(await f.text()));
              } catch {}
              e.target.value = "";
            }}
          />
          {typeof view === "string" && view !== "all" && (
            <SideAction onClick={() => props.onDeleteCollection(view)}>Delete this collection</SideAction>
          )}
          <div className="mt-4 rounded-xl border border-dashed border-line p-3 text-xs text-muted">
            Drag this to your bookmarks bar to save from any page:
            <a
              href={bookmarklet}
              onClick={(e) => e.preventDefault()}
              className="mt-2 block rounded-lg bg-fg px-3 py-1.5 text-center text-sm font-medium text-bg"
            >
              + Save to Design Lib
            </a>
          </div>
          <a
            href="https://github.com"
            className="px-2.5 pt-3 text-xs text-muted hover:text-fg"
            target="_blank"
            rel="noreferrer"
          >
            Free and open source · MIT
          </a>
        </div>
      </div>
    </aside>
  );
}

function SideAction({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="rounded-lg px-2.5 py-1.5 text-left text-muted hover:text-fg">
      {children}
    </button>
  );
}

function Card({
  b,
  lib,
  onMove,
  onDelete,
  onNote,
  onCopy,
}: {
  b: Bookmark;
  lib: Library;
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
      onDragStart={(e) => e.dataTransfer.setData("text/bookmark-id", b.id)}
      className="group overflow-hidden rounded-2xl border border-line bg-panel transition hover:border-fg/25"
    >
      <a href={b.url} target="_blank" rel="noreferrer" className="block aspect-[16/10] overflow-hidden bg-fg/[0.04]">
        {b.image && imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={b.image}
            alt=""
            loading="lazy"
            onError={() => setImgOk(false)}
            className="size-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="grid size-full place-items-center">
            <span className="text-3xl font-semibold tracking-tight text-fg/15">{b.library}</span>
          </div>
        )}
      </a>
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <a href={b.url} target="_blank" rel="noreferrer" className="line-clamp-1 text-sm font-medium first-letter:uppercase hover:underline">
            {b.title}
          </a>
          <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">{b.library}</span>
        </div>

        {b.install && (
          <button
            onClick={onCopy}
            title="Copy install command"
            className="truncate rounded-lg bg-fg/[0.05] px-2 py-1.5 text-left font-mono text-[11px] text-muted hover:text-fg"
          >
            {b.install}
          </button>
        )}

        {b.note && !editing && <p className="line-clamp-2 text-xs text-muted">“{b.note}”</p>}
        {editing && (
          <textarea
            autoFocus
            defaultValue={b.note}
            placeholder="Note for your agent, e.g. use for the pricing section"
            onBlur={(e) => {
              onNote(e.target.value.trim());
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) (e.target as HTMLTextAreaElement).blur();
            }}
            className="min-h-16 rounded-lg border border-line bg-transparent p-2 text-xs outline-none"
          />
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 gap-1 overflow-hidden">
            {b.tags.map((t) => (
              <span key={t} className="text-[11px] text-muted">
                #{t}
              </span>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
            <select
              value={b.collectionId ?? ""}
              onChange={(e) => onMove(e.target.value || null)}
              aria-label="Move to collection"
              className="h-7 max-w-28 rounded-md border border-line bg-panel px-1 text-[11px] text-muted outline-none"
            >
              <option value="">Inbox</option>
              {lib.collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <IconBtn label="Note" onClick={() => setEditing(true)}>✎</IconBtn>
            <IconBtn label={b.install ? "Copy install" : "Copy link"} onClick={onCopy}>⧉</IconBtn>
            <IconBtn label="Delete" onClick={onDelete}>×</IconBtn>
          </div>
        </div>
      </div>
    </article>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-7 place-items-center rounded-md text-sm text-muted hover:bg-fg/[0.06] hover:text-fg"
    >
      {children}
    </button>
  );
}

function Empty({ onAdd }: { onAdd: (url: string) => void }) {
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <h2 className="text-xl font-semibold tracking-tight">Your component library starts here</h2>
      <p className="mt-2 text-sm text-muted">
        Paste any link from shadcn, Magic UI, Aceternity, 21st.dev or anywhere else. Press{" "}
        <kbd className="rounded border border-line px-1 text-[11px]">⌘V</kbd> anywhere on this page.
      </p>
      <div className="mt-6 flex flex-col gap-2">
        {EXAMPLES.map((u) => (
          <button
            key={u}
            onClick={() => onAdd(u)}
            className="truncate rounded-xl border border-line bg-panel px-3 py-2 text-left font-mono text-xs text-muted hover:text-fg"
          >
            + {u.replace("https://", "")}
          </button>
        ))}
      </div>
      <p className="mt-6 text-xs text-muted">
        Everything stays in this browser for now. Download JSON any time to back it up.
      </p>
    </div>
  );
}

function download(lib: Library) {
  const blob = new Blob([JSON.stringify(lib, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `design-lib-${new Date().toISOString().slice(0, 10)}.json`;
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
