"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CatalogLibrary } from "@/lib/catalog/schema";
import type { GalleryItem } from "@/lib/useCatalog";
import { useCaptureAvailable } from "@/lib/useCatalog";
import { typeById } from "@/lib/types";
import { TRIGGERS, triggerById } from "@/lib/motion";

// The reference gallery: every component in the user's library, organized by
// library, shown the way inspo shows a page (preview, credit, tags, details).

const PAGE = 48;

export function Gallery({
  items,
  title,
  libraries,
  onOpen,
  empty,
  sections,
  onSite,
}: {
  items: GalleryItem[];
  title: string;
  libraries: CatalogLibrary[];
  onOpen: (item: GalleryItem) => void;
  empty?: React.ReactNode;
  // Library view: one row of cards per library, each opening its own page.
  sections?: { key: string; name: string; items: GalleryItem[] }[];
  onSite?: (key: string) => void;
}) {
  const [q, setQ] = useState("");
  const [trigger, setTrigger] = useState<string | null>(null);
  const [library, setLibrary] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const more = useRef<HTMLDivElement>(null);

  const libName = useMemo(() => new Map(libraries.map((l) => [l.id, l.name])), [libraries]);
  const nameOf = (i: GalleryItem) => i.site ?? libName.get(i.library) ?? i.library;

  const filtered = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return items.filter((i) => {
      if (trigger && !i.triggers.includes(trigger)) return false;
      if (library && i.library !== library) return false;
      if (type && i.type !== type) return false;
      if (!words.length) return true;
      const hay = `${i.title} ${i.name} ${i.description ?? ""} ${i.category ?? ""} ${nameOf(i)} ${i.tech.join(" ")}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, q, trigger, library, type]);

  const typeCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of items) m.set(i.type, (m.get(i.type) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]);
  }, [items]);

  const triggerCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of items) for (const t of i.triggers) m.set(t, (m.get(t) ?? 0) + 1);
    return m;
  }, [items]);
  const libCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of items) m.set(i.library, (m.get(i.library) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]);
  }, [items]);

  useEffect(() => setShown(PAGE), [items, q, trigger, library, type]);
  useEffect(() => setType(null), [items]);
  useEffect(() => {
    const el = more.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setShown((n) => n + PAGE), { rootMargin: "800px" });
    io.observe(el);
    return () => io.disconnect();
  }, [filtered.length]);

  return (
    <section>
      <div className="flex h-12 items-center justify-between gap-4">
        <h1 className="flex items-baseline gap-2">
          <span className="font-medium">{title}</span>
          <span className="text-faint tabular-nums">{filtered.length || ""}</span>
        </h1>
        <div className="flex items-center gap-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter"
            aria-label="Filter components"
            className="h-7 w-28 rounded-md bg-transparent px-2 text-right outline-none transition-[width,background-color] placeholder:text-faint focus:w-44 focus:bg-field-focus focus:text-left"
          />
          {libCounts.length <= 1 && typeCounts.length > 1 && (
            <label className="relative">
              <span className={`flex h-7 items-center rounded-md px-2 text-[12px] transition ${type ? "text-fg" : "text-faint hover:text-muted"}`}>
                {type ? typeById(type).name : "All types"}
              </span>
              <select
                value={type ?? ""}
                onChange={(e) => setType(e.target.value || null)}
                aria-label="Filter by type"
                className="absolute inset-0 cursor-pointer opacity-0"
              >
                <option value="">All types</option>
                {typeCounts.map(([id, n]) => (
                  <option key={id} value={id}>
                    {typeById(id).name} ({n})
                  </option>
                ))}
              </select>
            </label>
          )}
          {libCounts.length > 1 && (
            <label className="relative">
              <span className={`flex h-7 items-center rounded-md px-2 text-[12px] transition ${library ? "text-fg" : "text-faint hover:text-muted"}`}>
                {library ? libName.get(library) ?? library : "All sites"}
              </span>
              <select
                value={library ?? ""}
                onChange={(e) => setLibrary(e.target.value || null)}
                aria-label="Filter by site"
                className="absolute inset-0 cursor-pointer opacity-0"
              >
                <option value="">All sites</option>
                {libCounts.map(([id, n]) => (
                  <option key={id} value={id}>
                    {libName.get(id) ?? id} ({n})
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {triggerCounts.size > 1 && (
        <div className="-mx-1 mb-5 flex gap-0.5 overflow-x-auto pb-1">
          {TRIGGERS.filter((t) => triggerCounts.has(t.id)).map((t) => (
            <button
              key={t.id}
              onClick={() => setTrigger(trigger === t.id ? null : t.id)}
              className={`h-7 shrink-0 rounded-md px-2 text-[12px] whitespace-nowrap transition ${
                trigger === t.id ? "bg-hover text-fg" : "text-faint hover:text-muted"
              }`}
            >
              {t.name} <span className="tabular-nums opacity-60">{triggerCounts.get(t.id)}</span>
            </button>
          ))}
        </div>
      )}

      {sections && !q && !trigger && !library && !type ? (
        <div className="flex flex-col gap-12">
          {sections.map((sec) => (
            <section key={sec.key}>
              <button onClick={() => onSite?.(sec.key)} className="group mb-3 flex items-baseline gap-2 text-left">
                <span className="font-medium">{sec.name}</span>
                <span className="text-faint tabular-nums">{sec.items.length}</span>
                <span className="text-[12px] text-faint opacity-0 transition group-hover:opacity-100">View all</span>
              </button>
              <div data-grid className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {sec.items.slice(0, 4).map((i, n) => (
                  <div key={i.id} className={n === 3 ? "xl:hidden 2xl:block" : undefined}>
                    <ComponentCard item={i} site={nameOf(i)} onOpen={() => onOpen(i)} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        empty ?? <p className="pt-16 text-center text-muted">Nothing here yet.</p>
      ) : (
        <div data-grid className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.slice(0, shown).map((i) => (
            <ComponentCard key={i.id} item={i} site={nameOf(i)} onOpen={() => onOpen(i)} />
          ))}
        </div>
      )}
      {shown < filtered.length && <div ref={more} className="h-24" />}
    </section>
  );
}

// Follows the system theme, like the rest of the site.
function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setDark(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return dark;
}

export function Preview({ item, site, large }: { item: GalleryItem; site: string; large?: boolean }) {
  const dark = useDark();
  const image = (dark && item.previewDark) || item.preview;
  const video = (dark && item.videoDark) || item.video;
  return <PreviewMedia key={`${image}|${video}`} item={item} site={site} large={large} image={image} video={video} />;
}

function PreviewMedia({ item, site, large, image, video }: { item: GalleryItem; site: string; large?: boolean; image?: string; video?: string }) {
  const [img, setImg] = useState(Boolean(image));
  const [vid, setVid] = useState(Boolean(video));
  const ref = useRef<HTMLVideoElement>(null);

  if (vid && video)
    return (
      <video
        ref={ref}
        src={video}
        poster={img ? image : undefined}
        muted
        loop
        playsInline
        preload="none"
        autoPlay={large}
        onMouseEnter={() => ref.current?.play().catch(() => {})}
        onMouseLeave={() => !large && ref.current?.pause()}
        onError={() => setVid(false)}
        className="size-full object-cover"
      />
    );
  if (img && image)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        loading="lazy"
        draggable={false}
        onError={() => setImg(false)}
        className="size-full object-cover transition duration-500 ease-out group-hover:scale-[1.015]"
      />
    );
  // A saved page whose preview is still being recorded.
  return <Pending item={item} site={site} large={large} />;
}

function Pending({ item, site, large }: { item: GalleryItem; site: string; large?: boolean }) {
  const capture = useCaptureAvailable();
  return (
    <div className="flex size-full flex-col justify-between p-4">
      <span className="text-[11px] text-faint">{typeById(item.type).name}</span>
      <span className={`font-medium tracking-tight text-muted ${large ? "text-[28px]" : "text-[19px]"} leading-[1.1] line-clamp-3`}>
        {item.title}
      </span>
      <span className={`text-[11px] text-faint ${capture ? "animate-pulse" : ""}`}>
        {capture === false ? "No preview. Start the capture service to record one." : `Recording preview · ${site}`}
      </span>
    </div>
  );
}

function ComponentCard({ item, site, onOpen }: { item: GalleryItem; site: string; onOpen: () => void }) {
  return (
    <article data-card={item.id} className="group pop">
      <button
        onClick={onOpen}
        className="block aspect-[16/10] w-full overflow-hidden rounded-lg bg-hover text-left ring-1 ring-line ring-inset"
        aria-label={`${item.title} from ${site}`}
      >
        <Preview item={item} site={site} />
      </button>
      <div className="mt-2.5 px-0.5">
        <div className="flex items-baseline justify-between gap-3">
          <button onClick={onOpen} className="truncate text-left first-letter:uppercase">
            {item.title}
          </button>
          <span className="shrink-0 text-[12px] text-faint">{site}</span>
        </div>
        <p className="mt-0.5 truncate text-[12px] text-faint">
          {[...new Set([typeById(item.type).name, ...item.triggers.map((t) => triggerById(t)?.name ?? t)])].join(" · ")}
          {item.saved && <span> · saved</span>}
        </p>
      </div>
    </article>
  );
}

type SourceFile = { path: string; content: string; truncated?: boolean };

export function Detail({
  item,
  site,
  saved,
  onClose,
  onSave,
  copy,
}: {
  item: GalleryItem;
  site: string;
  saved: boolean;
  onClose: () => void;
  onSave: () => void;
  copy: (text: string, msg: string) => void;
}) {
  const [src, setSrc] = useState<{ state: "idle" | "loading" | "done" | "none"; files: SourceFile[]; from?: string }>({ state: "idle", files: [] });
  const [tab, setTab] = useState(0);
  const mine = item.id.startsWith("mine/");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => setSrc({ state: "idle", files: [] }), [item.id]);

  const loadSource = async () => {
    setSrc({ state: "loading", files: [] });
    try {
      const r = await fetch(`/api/source?id=${encodeURIComponent(item.id)}`);
      if (!r.ok) throw 0;
      const d = await r.json();
      setSrc({ state: "done", files: d.files ?? [], from: d.from });
      setTab(0);
    } catch {
      setSrc({ state: "none", files: [] });
    }
  };

  const forAgent = [
    `${item.title} (${site}), ${typeById(item.type).name}.`,
    item.description,
    `Reference: ${item.docs}`,
    item.install && `Install: ${item.install}`,
    !mine && `Quire id: ${item.id} (get_component_source in the Quire MCP returns its code)`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-label={item.title}>
      <button className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" onClick={onClose} aria-label="Close" />
      <aside className="slide relative flex h-full w-full max-w-[560px] flex-col overflow-y-auto border-l border-line bg-bg">
        <div className="flex h-12 shrink-0 items-center justify-between px-5">
          <span className="text-[12px] text-faint">{typeById(item.type).name}</span>
          <button onClick={onClose} className="text-[12px] text-faint transition hover:text-muted">
            Close
          </button>
        </div>
        <div className="px-5 pb-10">
          <div className="aspect-[16/10] overflow-hidden rounded-lg bg-hover ring-1 ring-line ring-inset">
            <Preview item={item} site={site} large />
          </div>

          <div className="mt-5 flex items-baseline justify-between gap-4">
            <h2 className="text-[17px] font-medium tracking-tight first-letter:uppercase">{item.title}</h2>
            <a href={item.docs} target="_blank" rel="noreferrer" className="shrink-0 text-[12px] text-muted transition hover:text-fg">
              {site} ↗
            </a>
          </div>
          {item.description && <p className="mt-1.5 text-muted">{item.description}</p>}
          {item.note && <p className="mt-1.5 text-muted">Note: {item.note}</p>}

          <dl className="mt-5 grid grid-cols-[88px_1fr] gap-y-1.5 text-[12px]">
            <dt className="text-faint">Type</dt>
            <dd>{typeById(item.type).name}</dd>
            {item.triggers.length > 0 && (
              <>
                <dt className="text-faint">Motion</dt>
                <dd>{item.triggers.map((t) => triggerById(t)?.name ?? t).join(", ")}</dd>
              </>
            )}
            {item.tech.length > 0 && (
              <>
                <dt className="text-faint">Built with</dt>
                <dd>{item.tech.join(", ")}</dd>
              </>
            )}
            {item.category && (
              <>
                <dt className="text-faint">On {site}</dt>
                <dd className="first-letter:uppercase">{item.category.replace(/-/g, " ")}</dd>
              </>
            )}
            {!mine && (
              <>
                <dt className="text-faint">Agent id</dt>
                <dd className="font-mono text-[11px] text-muted">{item.id}</dd>
              </>
            )}
          </dl>

          {item.install && (
            <button
              onClick={() => copy(item.install!, "Command copied")}
              title="Copy"
              className="mt-5 flex w-full items-center justify-between gap-3 rounded-md bg-field px-3 py-2 text-left font-mono text-[11px] text-muted transition hover:bg-field-focus"
            >
              <span className="truncate">{item.install}</span>
              <span className="shrink-0 font-sans text-faint">Copy</span>
            </button>
          )}

          <div className="mt-3 flex flex-wrap gap-1">
            <button onClick={onSave} disabled={saved} className="h-8 rounded-md bg-fg px-3 text-bg transition hover:opacity-85 disabled:bg-hover disabled:text-muted">
              {saved ? "Saved" : "Save to my library"}
            </button>
            <button onClick={() => copy(forAgent, "Copied for your agent")} className="h-8 rounded-md px-3 text-muted transition hover:bg-hover hover:text-fg">
              Copy for agent
            </button>
            <a href={item.docs} target="_blank" rel="noreferrer" className="flex h-8 items-center rounded-md px-3 text-muted transition hover:bg-hover hover:text-fg">
              Open docs
            </a>
          </div>

          {item.source && (
            <div className="mt-8">
              {src.state === "idle" && (
                <button onClick={loadSource} className="text-[12px] text-muted transition hover:text-fg">
                  Show source code
                </button>
              )}
              {src.state === "loading" && <p className="text-[12px] text-faint">Reading source…</p>}
              {src.state === "none" && <p className="text-[12px] text-faint">The source is not readable right now. Open the docs.</p>}
              {src.state === "done" && src.files.length > 0 && (
                <div>
                  <div className="flex items-center gap-0.5 overflow-x-auto">
                    {src.files.map((f, n) => (
                      <button
                        key={f.path}
                        onClick={() => setTab(n)}
                        className={`h-7 shrink-0 rounded-md px-2 font-mono text-[11px] transition ${tab === n ? "bg-hover text-fg" : "text-faint hover:text-muted"}`}
                      >
                        {f.path.split("/").pop()}
                      </button>
                    ))}
                    <button onClick={() => copy(src.files[tab].content, "Code copied")} className="ml-auto h-7 shrink-0 px-2 text-[12px] text-faint transition hover:text-muted">
                      Copy
                    </button>
                  </div>
                  <pre className="mt-1.5 max-h-[420px] overflow-auto rounded-md bg-field p-3 font-mono text-[11px] leading-relaxed text-muted">
                    {src.files[tab].content}
                    {src.files[tab].truncated && "\n…"}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

export function Onboarding({
  libraries,
  total,
  onChoose,
}: {
  libraries: CatalogLibrary[];
  total: number;
  onChoose: (mode: "curated" | "scratch") => void;
}) {
  return (
    <div className="mx-auto max-w-lg pt-20 pb-24">
      <p className="text-fg">How do you want to start?</p>
      <p className="mt-1 text-muted">Either way, your agent reads this library through the Quire MCP.</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <button onClick={() => onChoose("curated")} className="rounded-lg p-4 text-left ring-1 ring-line ring-inset transition hover:bg-hover">
          <span className="block font-medium">Curated library</span>
          <span className="mt-1 block text-[12px] text-muted">
            {total.toLocaleString("en")} components from {libraries.length} sites, sorted by type. Turn sites off any time.
          </span>
        </button>
        <button onClick={() => onChoose("scratch")} className="rounded-lg p-4 text-left ring-1 ring-line ring-inset transition hover:bg-hover">
          <span className="block font-medium">From scratch</span>
          <span className="mt-1 block text-[12px] text-muted">Start empty. Paste the link of each component library you want as reference.</span>
        </button>
      </div>
      <p className="mt-8 text-[12px] leading-relaxed text-faint">{libraries.map((l) => l.name).join(" · ")}</p>
    </div>
  );
}

export function Sources({
  libraries,
  followed,
  onToggle,
  onAll,
  onAddSite,
  imported,
}: {
  libraries: CatalogLibrary[];
  followed: Set<string>;
  onToggle: (id: string) => void;
  onAll: (on: boolean) => void;
  onAddSite: () => void;
  imported: { name: string; count: number }[];
}) {
  return (
    <section className="max-w-2xl pb-24">
      <div className="flex h-12 items-center justify-between">
        <h1 className="font-medium">Sites</h1>
        <div className="flex gap-1 text-[12px]">
          <button onClick={() => onAll(true)} className="rounded-md px-2 py-1 text-faint transition hover:text-muted">
            All on
          </button>
          <button onClick={() => onAll(false)} className="rounded-md px-2 py-1 text-faint transition hover:text-muted">
            All off
          </button>
        </div>
      </div>
      <p className="mb-4 text-muted">The curated sites in your library. Agents only see the sites you keep on.</p>
      <ul className="divide-y divide-line">
        {libraries.map((l) => {
          const on = followed.has(l.id);
          return (
            <li key={l.id} className="flex items-center gap-4 py-2.5">
              <button
                role="switch"
                aria-checked={on}
                aria-label={l.name}
                onClick={() => onToggle(l.id)}
                className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${on ? "bg-fg" : "bg-hover ring-1 ring-line ring-inset"}`}
              >
                <span className={`absolute top-0.5 left-0.5 size-3 rounded-full bg-bg transition-transform duration-200 ${on ? "translate-x-3" : ""}`} />
              </button>
              <div className="min-w-0 flex-1">
                <a href={l.url} target="_blank" rel="noreferrer" className={on ? "" : "text-muted"}>
                  {l.name}
                </a>
                <p className="truncate text-[12px] text-faint">{l.blurb}</p>
              </div>
              <span className="shrink-0 text-[12px] text-faint tabular-nums">{l.count}</span>
            </li>
          );
        })}
      </ul>

      <div className="mt-10 flex h-8 items-center justify-between">
        <h2 className="font-medium">Your sites</h2>
        <button onClick={onAddSite} className="text-[12px] text-muted transition hover:text-fg">
          Add a site by link
        </button>
      </div>
      {imported.length ? (
        <ul className="mt-2 divide-y divide-line">
          {imported.map((s) => (
            <li key={s.name} className="flex justify-between py-2.5">
              <span>{s.name}</span>
              <span className="text-[12px] text-faint tabular-nums">{s.count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-muted">Paste the link of any component library. Quire reads it and adds each component by type.</p>
      )}
    </section>
  );
}

export function Agents({
  syncKey,
  syncedAt,
  available,
  onEnable,
  onSyncNow,
  copy,
}: {
  syncKey?: string;
  syncedAt?: number;
  available: boolean | null;
  onEnable: () => void;
  onSyncNow: () => void;
  copy: (text: string, msg: string) => void;
}) {
  const [origin, setOrigin] = useState("https://quire.fyi");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/api/mcp${syncKey ? `?key=${syncKey}` : ""}`;
  const rows = [
    { name: "Claude Code", text: `claude mcp add --transport http quire "${url}"` },
    { name: "Codex", text: `codex mcp add quire --url "${url}"` },
    { name: "Cursor, Windsurf, VS Code", text: JSON.stringify({ mcpServers: { quire: { url } } }, null, 2) },
  ];
  return (
    <section className="max-w-2xl pb-24">
      <div className="flex h-12 items-center">
        <h1 className="font-medium">Agents</h1>
      </div>
      <p className="text-muted">
        Add Quire as an MCP server. Your agent can then search components by type and motion, and read their real source code before it writes UI.
      </p>

      <div className="mt-6 rounded-lg p-4 ring-1 ring-line ring-inset">
        {syncKey ? (
          <>
            <p>Your library is connected.</p>
            <p className="mt-1 text-[12px] text-muted">
              The address below holds a private key. Anyone with it can read your library.
              {syncedAt ? ` Last sync ${new Date(syncedAt).toLocaleString()}.` : ""}
            </p>
            <button onClick={onSyncNow} className="mt-2 text-[12px] text-muted transition hover:text-fg">
              Sync now
            </button>
          </>
        ) : available === false ? (
          <>
            <p>The curated library is ready for agents.</p>
            <p className="mt-1 text-[12px] text-muted">This server has no storage set up yet, so your own library stays in this browser for now.</p>
          </>
        ) : (
          <>
            <p>Agents read the curated library.</p>
            <p className="mt-1 text-[12px] text-muted">Connect your library so they read your sites, saved components and notes instead.</p>
            <button onClick={onEnable} disabled={available === null} className="mt-3 h-8 rounded-md bg-fg px-3 text-bg transition hover:opacity-85 disabled:opacity-40">
              Connect my library
            </button>
          </>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {rows.map((r) => (
          <div key={r.name}>
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] text-faint">{r.name}</span>
              <button onClick={() => copy(r.text, "Copied")} className="text-[12px] text-faint transition hover:text-muted">
                Copy
              </button>
            </div>
            <pre className="mt-1 overflow-x-auto rounded-md bg-field px-3 py-2 font-mono text-[11px] text-muted">{r.text}</pre>
          </div>
        ))}
      </div>

      <h2 className="mt-10 font-medium">Tools</h2>
      <ul className="mt-2 flex flex-col gap-1.5 text-[12px] text-muted">
        <li><code className="text-fg">recommend(brief)</code> picks component types from a plain brief and returns references for each.</li>
        <li><code className="text-fg">search_components</code> by words, type, motion trigger, tech or site.</li>
        <li><code className="text-fg">get_component_source(id)</code> returns the real code from the site&apos;s registry or repo.</li>
        <li><code className="text-fg">get_component</code>, <code className="text-fg">get_filters</code>, <code className="text-fg">list_libraries</code>.</li>
      </ul>
    </section>
  );
}
