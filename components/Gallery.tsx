"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CatalogLibrary, LiveDemo as Live, LiveVariant } from "@/lib/catalog/schema";
import type { GalleryItem } from "@/lib/useCatalog";
import { useCaptureAvailable } from "@/lib/useCatalog";
import { typeById } from "@/lib/types";
import { TRIGGERS, triggerById } from "@/lib/motion";
import StarIcon from "@/components/StarIcon";
import { Tip } from "@/components/ui/tooltip";
import { deal } from "@/lib/deal";
import { agentText } from "@/lib/agentText";
import { ArrowLeft, Maximize2, Settings, X } from "lucide-react";

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
  onStar,
  tools,
  intro,
  onDeal,
  onAgent,
}: {
  items: GalleryItem[];
  title: string;
  libraries: CatalogLibrary[];
  onOpen: (item: GalleryItem) => void;
  empty?: React.ReactNode;
  // Library view: one row of cards per library, each opening its own page.
  sections?: { key: string; name: string; items: GalleryItem[] }[];
  onSite?: (key: string) => void;
  // Star on each card: saves the component to Saved, or removes it.
  onStar?: (item: GalleryItem) => void;
  // Actions for a starred card (collection, type, note, copy, delete), shown beside the star.
  tools?: (item: GalleryItem) => React.ReactNode;
  // First load: deal the visible cards from a pile. onDeal gets the time in
  // ms until the last card lands, so the rest of the page can follow it.
  intro?: boolean;
  onDeal?: (ms: number) => void;
  // "Copy for agent" beside the card title: gets the same text as the drawer's button.
  onAgent?: (text: string) => void;
}) {
  const [trigger, setTrigger] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const more = useRef<HTMLDivElement>(null);

  const libName = useMemo(() => new Map(libraries.map((l) => [l.id, l.name])), [libraries]);
  const nameOf = (i: GalleryItem) => i.site ?? libName.get(i.library) ?? i.library;

  const filtered = useMemo(() => (trigger ? items.filter((i) => i.triggers.includes(trigger)) : items), [items, trigger]);

  const triggerCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of items) for (const t of i.triggers) m.set(t, (m.get(t) ?? 0) + 1);
    return m;
  }, [items]);

  // Starring moves a card to the top. Measure every card before the change,
  // then glide each one from its old place to its new one (FLIP).
  const root = useRef<HTMLElement>(null);
  const before = useRef<Map<string, DOMRect> | null>(null);
  const star = onStar && ((i: GalleryItem) => {
    const m = new Map<string, DOMRect>();
    root.current?.querySelectorAll<HTMLElement>("[data-card]").forEach((el) => m.set(el.dataset.card!, el.getBoundingClientRect()));
    before.current = m;
    onStar(i);
  });
  useLayoutEffect(() => {
    const prev = before.current;
    before.current = null;
    if (!prev || !root.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const easing = "cubic-bezier(.2,.8,.2,1)";
    root.current.querySelectorAll<HTMLElement>("[data-card]").forEach((el) => {
      const was = prev.get(el.dataset.card!);
      if (!was) {
        el.animate([{ opacity: 0, transform: "scale(.96)" }, { opacity: 1, transform: "none" }], { duration: 320, easing });
        return;
      }
      const now = el.getBoundingClientRect();
      const dx = was.left - now.left;
      const dy = was.top - now.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      // Far moves take a little longer, so every card reads as one motion.
      const duration = Math.min(700, 380 + Math.hypot(dx, dy) * 0.25);
      el.style.position = "relative";
      el.style.zIndex = "2";
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration, easing }).onfinish = () => {
        el.style.position = "";
        el.style.zIndex = "";
      };
    });
  }, [items]);

  // Runs once, as soon as the first cards are in the page.
  const dealtRef = useRef(false);
  useLayoutEffect(() => {
    if (!intro || dealtRef.current || !root.current?.querySelector("[data-card]")) return;
    dealtRef.current = true;
    onDeal?.(deal(root.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intro, items, sections]);

  useEffect(() => setShown(PAGE), [items, trigger]);
  useEffect(() => {
    const el = more.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setShown((n) => n + PAGE), { rootMargin: "800px" });
    io.observe(el);
    return () => io.disconnect();
  }, [filtered.length]);

  return (
    <section ref={root}>
      {/* Title and interaction chips stay pinned under the top bar. */}
      <div data-chrome style={{ "--d": "120ms" } as React.CSSProperties} className="sticky top-14 z-[9] -mx-4 mb-5 bg-bg/90 px-4 backdrop-blur-md md:mx-0 md:px-0">
      <div className="flex h-12 items-center">
        <h1 className="flex items-baseline gap-2">
          <span className="font-medium">{title}</span>
          <span className="text-faint tabular-nums">{filtered.length || ""}</span>
        </h1>
      </div>

      {triggerCounts.size > 1 && (
        <div className="-mx-1 flex gap-0.5 overflow-x-auto pb-2">
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
      </div>

      {sections && !trigger ? (
        <div className="flex flex-col gap-12">
          {sections.map((sec) => (
            <section key={sec.key}>
              <button data-chrome style={{ "--d": "160ms" } as React.CSSProperties} onClick={() => onSite?.(sec.key)} className="group mb-3 flex items-baseline gap-2 text-left">
                <span className="font-medium">{sec.name}</span>
                <span className="text-faint tabular-nums">{sec.items.length}</span>
                <span className="text-[12px] text-faint opacity-0 transition group-hover:opacity-100">View all</span>
              </button>
              <div data-grid className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 xl:grid-cols-3">
                {sec.items.slice(0, 4).map((i, n) => (
                  <div key={i.id} className={n === 3 ? "xl:hidden" : undefined}>
                    <ComponentCard item={i} site={nameOf(i)} onOpen={() => onOpen(i)} onStar={star && (() => star(i))} tools={tools?.(i)} onAgent={onAgent && (() => onAgent(agentText(i, nameOf(i))))} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        empty ?? <p className="pt-16 text-center text-muted">Nothing here yet.</p>
      ) : (
        <div data-grid className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.slice(0, shown).map((i) => (
            <ComponentCard key={i.id} item={i} site={nameOf(i)} onOpen={() => onOpen(i)} onStar={star && (() => star(i))} tools={tools?.(i)} onAgent={onAgent && (() => onAgent(agentText(i, nameOf(i))))} />
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

function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduce(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduce;
}

// still: the image only. A live demo plays over it, so the clip is not needed.
export function Preview({ item, site, large, still }: { item: GalleryItem; site: string; large?: boolean; still?: boolean }) {
  const dark = useDark();
  const image = (dark && item.previewDark) || item.preview;
  const video = still ? undefined : (dark && item.videoDark) || item.video;
  return <PreviewMedia key={`${image}|${video}`} item={item} site={site} large={large} image={image} video={video} />;
}

// Card clips loop on their own while they are on screen (or about to be), and pause off
// screen, so only the cards in view decode at a time. One observer serves every card.
// With reduced motion a clip plays only while the mouse is over it.
const onScreen = new Map<Element, (visible: boolean) => void>();
let screenObserver: IntersectionObserver | undefined;
function watchOnScreen(el: Element, cb: (visible: boolean) => void) {
  screenObserver ??= new IntersectionObserver((entries) => entries.forEach((e) => onScreen.get(e.target)?.(e.isIntersecting)), { rootMargin: "200px 0px" });
  onScreen.set(el, cb);
  screenObserver.observe(el);
  return () => {
    onScreen.delete(el);
    screenObserver?.unobserve(el);
  };
}

function PreviewMedia({ item, site, large, image, video }: { item: GalleryItem; site: string; large?: boolean; image?: string; video?: string }) {
  const [img, setImg] = useState(Boolean(image));
  const [vid, setVid] = useState(Boolean(video));
  const ref = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || large) return;
    if (reduce) return el.pause();
    return watchOnScreen(el, (visible) => {
      if (visible) el.play().catch(() => {});
      else el.pause();
    });
  }, [vid, large, reduce]);

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
        autoPlay={large && !reduce}
        onMouseEnter={reduce ? () => ref.current?.play().catch(() => {}) : undefined}
        onMouseLeave={reduce && !large ? () => ref.current?.pause() : undefined}
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

// The component itself, running on the Quire stage (public/stage/, built by stage/build.sh)
// in a frame on this site's own origin. The frame lays the demo out at the size it was
// captured at (live.view) and shows the part the stills and clips show (live.frame), scaled
// to fit, so it lines up with the clip under it. It fades in once the demo has mounted.
// card: the frame runs in a gallery card, where nothing in it reaches the card.
// picked: the variants chosen in the gear menu, which the stage page takes as v= and p=.
function LiveDemo({ live, title, onEscape, onReady, card, picked }: { live: Live; title: string; onEscape?: () => void; onReady?: () => void; card?: boolean; picked?: Picked }) {
  const dark = useDark();
  const base = (dark && live.srcDark) || live.src;
  const src = `${base}${card ? "&card=1" : ""}${variantQuery(live.variants, picked)}`;
  return <LiveFrame key={src} src={src} frame={(dark && live.frameDark) || live.frame} view={live.view} title={title} onEscape={onEscape} onReady={onReady} />;
}

// Variants: other examples of a component (v, Magic UI) or its docs controls (Animate UI props).
type Picked = Record<string, unknown>;
function variantQuery(groups: LiveVariant[] | undefined, picked: Picked = {}) {
  const q = new URLSearchParams();
  const props: Picked = {};
  for (const g of groups ?? []) {
    if (!(g.key in picked)) continue;
    if (g.key === "v") picked.v && q.set("v", String(picked.v));
    else props[g.key] = picked[g.key];
  }
  if (Object.keys(props).length) q.set("p", JSON.stringify(props));
  const s = q.toString();
  return s ? `&${s}` : "";
}
const current = (g: LiveVariant, picked: Picked) => (g.key in picked ? picked[g.key] : (g.value ?? ""));

// The gear on a live preview. It opens the variants in a ring around itself: the options of
// the one choice there is, or first the choices (Variant, Size, Side...) and then the options
// of the one picked. Picking an option switches the live demo to it.
// always: shown without a hover (the details panel).
export function VariantsMenu({ groups, picked, onPick, onOpenChange, always }: { groups: LiveVariant[]; picked: Picked; onPick: (p: Picked) => void; onOpenChange?: (open: boolean, at?: { x: number; y: number }) => void; always?: boolean }) {
  const btn = useRef<HTMLButtonElement>(null);
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const [group, setGroup] = useState<number | null>(null);
  const [shown, setShown] = useState(false);
  const one = groups.length === 1;
  const changed = groups.some((g) => g.key in picked && picked[g.key] !== (g.value ?? ""));
  const events = useRef({ onOpenChange });
  events.current = { onOpenChange };
  // Where the mouse last was over the menu, so the card knows whether it is still on it.
  const mouse = useRef<{ x: number; y: number } | undefined>(undefined);
  const open = (o: boolean) => {
    const r = btn.current?.getBoundingClientRect();
    setAt(o && r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null);
    setGroup(one ? 0 : null);
    events.current.onOpenChange?.(o, mouse.current);
  };
  useEffect(() => {
    if (!at) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      open(false);
    };
    const away = () => open(false);
    window.addEventListener("keydown", key, true);
    window.addEventListener("resize", away);
    document.addEventListener("scroll", away, true);
    return () => {
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("resize", away);
      document.removeEventListener("scroll", away, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at]);
  // The ring grows out of the gear: it mounts at the center, then moves out.
  useEffect(() => {
    setShown(false);
    if (!at) return;
    const f = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    return () => cancelAnimationFrame(f);
  }, [at, group]);

  const g = group === null ? null : groups[group];
  const items = g
    ? g.options.map((o) => ({ label: o.label, active: current(g, picked) === o.value, pick: () => (onPick({ ...picked, [g.key]: o.value }), open(false)) }))
    : groups.map((x, i) => ({ label: x.label, active: x.key in picked && picked[x.key] !== (x.value ?? ""), pick: () => setGroup(i) }));
  // Wide enough that the labels do not touch, and kept on screen.
  const r = Math.min(130, Math.max(62, (items.length * 78) / (2 * Math.PI)));
  let cx = at?.x ?? 0, cy = at?.y ?? 0;
  if (at && typeof window !== "undefined") {
    cx = Math.min(window.innerWidth - r - 52, Math.max(r + 52, cx));
    cy = Math.min(window.innerHeight - r - 20, Math.max(r + 20, cy));
  }
  const stop = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <>
      <Tip label="Variants">
        <button
          ref={btn}
          type="button"
          data-variants
          aria-label="Variants"
          aria-expanded={Boolean(at)}
          onClick={(e) => {
            stop(e);
            open(!at);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={`absolute bottom-2 left-2 z-10 flex size-7 items-center justify-center rounded-md bg-bg/80 shadow-sm ring-1 ring-line backdrop-blur-sm transition hover:bg-bg hover:text-fg focus-visible:opacity-100 [@media(hover:none)]:opacity-100 ${
            at || changed ? "text-fg opacity-100" : always ? "text-muted" : "text-muted opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
          }`}
        >
          <Settings size={14} strokeWidth={1.75} aria-hidden className={`transition-transform duration-300 ${at ? "rotate-90" : ""}`} />
          {changed && <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-[#F59F00] ring-2 ring-bg" />}
        </button>
      </Tip>
      {at &&
        createPortal(
          <div
            className="fixed inset-0 z-50"
            onPointerMove={(e) => (mouse.current = { x: e.clientX, y: e.clientY })}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => (stop(e), open(false))}
            role="menu"
            aria-label={g ? g.label : "Variants"}
          >
            {/* A soft disc under the ring, so its labels read over the page. */}
            <div
              aria-hidden
              style={{ left: cx, top: cy, width: 2 * r + 96, height: 2 * r + 96, transform: `translate(-50%, -50%) scale(${shown ? 1 : 0.3})` }}
              className={`pointer-events-none absolute rounded-full bg-bg/70 ring-1 ring-line backdrop-blur-[3px] transition-[transform,opacity] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] ${shown ? "opacity-100" : "opacity-0"}`}
            />
            {items.map((it, i) => {
              const a = -Math.PI / 2 + (i / items.length) * 2 * Math.PI;
              const x = shown ? Math.cos(a) * r : 0, y = shown ? Math.sin(a) * r : 0;
              return (
                <button
                  key={`${group}-${it.label}`}
                  type="button"
                  role="menuitemradio"
                  aria-checked={it.active}
                  onClick={(e) => (stop(e), it.pick())}
                  style={{ left: cx, top: cy, transform: `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${shown ? 1 : 0.4})`, transitionDelay: shown ? `${i * 14}ms` : "0ms" }}
                  className={`absolute max-w-[150px] truncate rounded-full px-2.5 py-1 text-[11px] leading-4 whitespace-nowrap shadow-[0_6px_20px_-6px_rgb(0_0_0/0.35)] ring-1 transition-[transform,opacity,background-color] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] ${shown ? "opacity-100" : "opacity-0"} ${
                    it.active ? "bg-fg text-bg ring-fg" : "bg-bg text-fg ring-line hover:bg-hover"
                  }`}
                >
                  {it.label}
                </button>
              );
            })}
            <button
              type="button"
              aria-label={g && !one ? "Back to the choices" : "Close"}
              onClick={(e) => (stop(e), g && !one ? setGroup(null) : open(false))}
              style={{ left: cx, top: cy }}
              className="absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-fg text-bg shadow-md transition hover:opacity-90"
            >
              {g && !one ? <ArrowLeft size={14} aria-hidden /> : <X size={14} aria-hidden />}
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}

// A card runs its component live as soon as the mouse means it, so it can be hovered, clicked,
// dragged and typed in right in the grid. The clip loops until then and comes back when the
// mouse leaves. Only one card runs live at a time, so 160+ cards stay light.
// Intent: the mouse enters slowly, slows down on the card, stops on it, or stays on it for
// 300 ms. A pass across the grid is fast and starts nothing; a demo that has not shown yet when
// the mouse leaves is dropped at once, so a pass never flashes one.
// hold: the variants menu is open, so the demo stays live while the mouse is on the menu.
// The enter and leave events are the page's own, not React's: the menu is a portal, outside the
// card on the page but inside it in React, and leaving the card for the menu must count.
let liveCard: (() => void) | undefined;
type Point = { x: number; y: number };
// The mouse's speed in px/ms, smoothed, from one listener for the whole page.
const pointer = { x: 0, y: 0, t: 0, v: Infinity, on: false };
function trackPointer() {
  if (pointer.on) return;
  pointer.on = true;
  document.addEventListener("pointermove", (e) => {
    const dt = e.timeStamp - pointer.t;
    const d = Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y);
    // After a pause, the first move's distance is what it covered in about one frame.
    pointer.v = dt > 100 ? d / 16 : dt > 0 ? pointer.v * 0.5 + (d / dt) * 0.5 : pointer.v;
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.t = e.timeStamp;
  }, { passive: true, capture: true });
}
const SLOW = 0.35; // px/ms: slower than a pass across the grid
const REST = 50; // ms without a move: the mouse stopped
const DWELL = 300; // ms on the card: it is meant, however the mouse moves
// The demo's own phase. The pointer facts (inside, held) sit beside it, since they change on
// their own: the menu can be held open with the mouse off the card.
//
//   off ──start──▶ loading ──ready──▶ shown
//    ▲                │                 │
//    └────── end ─────┘    end ──▶ (grace, 250 ms) ──▶ off
//
// Timers: rest and dwell arm a start (one after the mouse stops, one after 300 ms on the
// card); grace delays the end of a shown demo. A start or an end clears all three; a move
// clears rest and grace only, so dwell keeps counting.
type Demo = "off" | "loading" | "shown";
function useCardLive(enabled: boolean) {
  const [demo, setDemo] = useState<Demo>("off");
  const ref = useRef<HTMLDivElement>(null);
  const timers = useRef<{ rest?: ReturnType<typeof setTimeout>; dwell?: ReturnType<typeof setTimeout>; grace?: ReturnType<typeof setTimeout> }>({});
  // Read by the page's event listeners, which outlive a render. demo mirrors the state above.
  const state = useRef<{ inside: boolean; held: boolean; demo: Demo }>({ inside: false, held: false, demo: "off" });
  const [fns] = useState(() => {
    const to = (d: Demo) => { state.current.demo = d; setDemo(d); };
    const clear = (...names: ("rest" | "dwell" | "grace")[]) => names.forEach((n) => clearTimeout(timers.current[n]));
    const stop = () => to("off");
    const start = () => {
      clear("rest", "dwell", "grace");
      if (liveCard !== stop) liveCard?.();
      liveCard = stop;
      if (state.current.demo === "off") to("loading");
    };
    const end = () => {
      clear("rest", "dwell", "grace");
      const off = () => {
        if (state.current.held || state.current.inside) return;
        if (liveCard === stop) liveCard = undefined;
        stop();
      };
      // Not on screen yet: drop it now. On screen: a short grace, so a slip past the edge keeps it.
      if (state.current.demo !== "shown") return off();
      timers.current.grace = setTimeout(off, 250);
    };
    const ready = () => { if (state.current.demo === "loading") to("shown"); };
    // Near: on the card or within the variants ring around its corner.
    const near = (at: Point, m = 150) => {
      const r = ref.current?.getBoundingClientRect();
      return Boolean(r && at.x >= r.left - m && at.x <= r.right + m && at.y >= r.top - m && at.y <= r.bottom + m);
    };
    // After a pick the demo stays, so the variant shows, until the mouse moves away from the
    // card and its ring (the page sends the card no enter or leave until the mouse is back on it).
    const watch = (e: PointerEvent) => {
      if (near({ x: e.clientX, y: e.clientY })) return;
      document.removeEventListener("pointermove", watch);
      state.current.inside = false;
      end();
    };
    return { stop, start, end, ready, near, watch, clear };
  });
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const { start, end, stop, watch, clear } = fns;
    const t = timers.current;
    trackPointer();
    // Start now when the mouse comes in slowly; else when it slows down or stops on the card.
    const enter = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      state.current.inside = true;
      document.removeEventListener("pointermove", watch);
      clear("rest", "dwell", "grace");
      // The page saw no move for a while (the mouse was over a live demo's frame): wait for one.
      if (e.timeStamp - pointer.t < 100 && pointer.v < SLOW) return start();
      t.rest = setTimeout(start, REST);
      t.dwell = setTimeout(start, DWELL);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch" || !state.current.inside || liveCard === stop) return;
      clear("rest", "grace");
      if (pointer.v < SLOW) return start();
      t.rest = setTimeout(start, REST);
    };
    // A short grace, so a slip past the edge keeps the demo as it is.
    const leave = () => {
      state.current.inside = false;
      end();
    };
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      document.removeEventListener("pointermove", watch);
      clear("rest", "dwell", "grace");
      if (liveCard === stop) liveCard = undefined;
    };
  }, [enabled, fns]);
  return {
    on: enabled && demo !== "off",
    ref,
    // The demo is ready and fades in.
    ready: fns.ready,
    // at: where the mouse is when the menu closes.
    hold: (held: boolean, at?: Point) => {
      state.current.held = held;
      fns.clear("rest", "grace");
      if (held) return fns.start();
      if (at) state.current.inside = fns.near(at);
      if (state.current.inside) document.addEventListener("pointermove", fns.watch);
      fns.end();
    },
  };
}

function LiveFrame({ src, frame, view, title, onEscape, onReady }: { src: string; frame: number[]; view: number[]; title: string; onEscape?: () => void; onReady?: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const win = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(0);
  const [ready, setReady] = useState(false);
  const [x, y, w] = frame;
  const events = useRef({ onEscape, onReady });
  events.current = { onEscape, onReady };

  // Measured before paint, so the frame starts loading in the same commit as the box.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    setScale(el.clientWidth / w);
    const ro = new ResizeObserver(() => setScale(el.clientWidth / w));
    ro.observe(el);
    return () => ro.disconnect();
  }, [w]);
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== win.current?.contentWindow || e.data?.source !== "quire-stage") return;
      if (e.data.event === "ready") { setReady(true); events.current.onReady?.(); }
      if (e.data.event === "escape") events.current.onEscape?.();
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, []);

  return (
    <div ref={box} className={`absolute inset-0 overflow-hidden transition-opacity duration-150 ${ready ? "opacity-100" : "pointer-events-none opacity-0"}`}>
      {scale > 0 && (
        <iframe
          ref={win}
          src={src}
          title={`${title}, live demo`}
          allow="clipboard-write"
          className="absolute top-0 left-0 origin-top-left border-0"
          style={{ width: view[0], height: view[1], transform: `scale(${scale}) translate(${-x}px, ${-y}px)` }}
        />
      )}
    </div>
  );
}

function ComponentCard({
  item,
  site,
  onOpen,
  onStar,
  tools,
  onAgent,
}: {
  item: GalleryItem;
  site: string;
  onOpen: () => void;
  onStar?: () => void;
  tools?: React.ReactNode;
  onAgent?: () => void;
}) {
  const starred = Boolean(item.saved);
  // Plays the pop and glint once, right after the user stars the card.
  const [pop, setPop] = useState(false);
  const live = useCardLive(Boolean(item.live));
  const [picked, setPicked] = useState<Picked>({});
  return (
    <article data-card={item.id} className="group pop">
      <div ref={live.ref} className="relative">
        {/* The preview runs the component live under the mouse; the corner icon opens the details. */}
        <div className="relative block aspect-[16/10] w-full overflow-hidden rounded-lg bg-hover ring-1 ring-line ring-inset">
          <Preview item={item} site={site} />
          {live.on && item.live && <LiveDemo live={item.live} title={item.title} card picked={picked} onReady={live.ready} />}
        </div>
        {item.live?.variants && <VariantsMenu groups={item.live.variants} picked={picked} onPick={setPicked} onOpenChange={live.hold} />}
        <OpenDetails onClick={onOpen} />
        {onStar && (
          <Tip label={starred ? "Remove from Starred" : "Star"}>
          <button
            type="button"
            data-star
            onClick={(e) => {
              // The card opens on click; the star must not.
              e.preventDefault();
              e.stopPropagation();
              setPop(!starred);
              onStar();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-pressed={starred}
            aria-label={starred ? `Remove ${item.title} from Saved` : `Save ${item.title}`}
            onAnimationEnd={() => setPop(false)}
            className={`absolute top-2 right-2 z-10 flex size-7 items-center justify-center rounded-md bg-bg/80 shadow-sm ring-1 ring-line backdrop-blur-sm transition hover:bg-bg focus-visible:opacity-100 [@media(hover:none)]:opacity-100 ${
              starred ? "opacity-100" : "text-muted opacity-0 group-hover:opacity-100 hover:text-[#F59F00]"
            } ${pop ? "star-pop" : ""}`}
          >
            <StarIcon filled={starred} />
          </button>
          </Tip>
        )}
        {starred && tools}
      </div>
      <div className="mt-3 px-0.5">
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 truncate first-letter:uppercase">{item.title}</span>
          {onAgent && <AgentButton onClick={onAgent} />}
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate text-[12px] text-faint">
            {[...new Set([typeById(item.type).name, ...item.triggers.map((t) => triggerById(t)?.name ?? t)])].join(" · ")}
          </p>
          <span className="shrink-0 text-[12px] text-faint">{site}</span>
        </div>
      </div>
    </article>
  );
}

// The open-details icon in a card preview's bottom-right corner, styled like the star.
export function OpenDetails({ onClick }: { onClick: () => void }) {
  return (
    <Tip label="Open details">
    <button
      type="button"
      data-open
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label="Open details"
      className="absolute right-2 bottom-2 z-10 flex size-7 items-center justify-center rounded-md bg-bg/80 text-muted opacity-0 shadow-sm ring-1 ring-line backdrop-blur-sm transition group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-bg hover:text-fg focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
    >
      <Maximize2 size={14} strokeWidth={1.75} aria-hidden />
    </button>
    </Tip>
  );
}

// "Copy for agent" on a card, beside the title. Its click stays off the card.
export function AgentButton({ onClick }: { onClick: () => void }) {
  return (
    <Tip label="Copy an agent-ready description">
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="btn btn-secondary btn-sm -my-[3px] -mr-0.5 shrink-0 !h-[22px] !px-2 text-[11px]"
    >
      Copy for agent
    </button>
    </Tip>
  );
}

type SourceFile = { path: string; content: string; truncated?: boolean };

export function Detail({
  item,
  site,
  saved,
  onClose,
  onStar,
  copy,
}: {
  item: GalleryItem;
  site: string;
  saved: boolean;
  onClose: () => void;
  // The star is the only way to save: it adds to Saved or removes from it.
  onStar: () => void;
  copy: (text: string, msg: string) => void;
}) {
  // The component's source: not asked for yet, being read, read, or not readable.
  const [src, setSrc] = useState<{ state: "idle" | "loading" | "none" } | { state: "done"; files: SourceFile[]; from?: string }>({ state: "idle" });
  const [tab, setTab] = useState(0);
  const [run, setRun] = useState(0);
  const [picked, setPicked] = useState<Picked>({});
  const mine = item.id.startsWith("mine/");
  const [pop, setPop] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => setSrc({ state: "idle" }), [item.id]);

  const loadSource = async () => {
    setSrc({ state: "loading" });
    try {
      const r = await fetch(`/api/source?id=${encodeURIComponent(item.id)}`);
      if (!r.ok) throw 0;
      const d = await r.json();
      setSrc({ state: "done", files: d.files ?? [], from: d.from });
      setTab(0);
    } catch {
      setSrc({ state: "none" });
    }
  };

  const forAgent = agentText(item, site);

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
          <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-hover">
            <Preview item={item} site={site} large still={Boolean(item.live)} />
            {item.live && <LiveDemo key={`${item.id}|${run}`} live={item.live} title={item.title} onEscape={onClose} picked={picked} />}
            <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-line ring-inset" />
            {item.live?.variants && <VariantsMenu groups={item.live.variants} picked={picked} onPick={setPicked} always />}
          </div>
          {item.live && (
            <div className="mt-1.5 flex items-center justify-between text-[12px] text-faint">
              <span>Live. Hover, click and type in it.</span>
              <button onClick={() => setRun((n) => n + 1)} className="transition hover:text-muted">
                Restart
              </button>
            </div>
          )}

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
            <Tip label="Copy install command">
            <button
              onClick={() => copy(item.install!, "Command copied")}
              className="mt-5 flex w-full items-center justify-between gap-3 rounded-md bg-field px-3 py-2 text-left font-mono text-[11px] text-muted transition hover:bg-field-focus"
            >
              <span className="truncate">{item.install}</span>
              <span className="shrink-0 font-sans text-faint">Copy</span>
            </button>
            </Tip>
          )}

          <div className="mt-3 flex flex-wrap gap-1.5">
            <Tip label={saved ? "Remove from Starred" : "Add to Starred"}>
            <button
              type="button"
              data-star
              onClick={() => {
                setPop(!saved);
                onStar();
              }}
              aria-pressed={saved}
              className={`group btn ${saved ? "btn-secondary" : "btn-primary"}`}
            >
              <span className={`flex ${pop ? "star-pop" : ""}`} onAnimationEnd={() => setPop(false)}>
                <StarIcon filled={saved} />
              </span>
              {saved ? "Starred" : "Star"}
            </button>
            </Tip>
            <button onClick={() => copy(forAgent, "Copied for your agent")} className="btn btn-secondary">
              Copy for agent
            </button>
            <a href={item.docs} target="_blank" rel="noreferrer" className="btn btn-secondary">
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
            <button onClick={onEnable} disabled={available === null} className="btn btn-primary mt-3">
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
