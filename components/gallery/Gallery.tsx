"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { type CatalogLibrary } from "@/lib/catalog/schema";
import { type GalleryItem } from "@/lib/useCatalog";
import { typeById } from "@/lib/types";
import { TRIGGERS, triggerById } from "@/lib/motion";
import StarIcon from "@/components/StarIcon";
import { Tip } from "@/components/ui/tooltip";
import { deal } from "@/lib/deal";
import { agentText } from "@/lib/agentText";
import { useCardLive } from "@/components/gallery/useCardLive";
import type { Picked } from "@/components/gallery/types";
import { LiveDemo, Preview } from "@/components/gallery/Preview";
import { VariantsMenu } from "@/components/gallery/VariantsMenu";
import { AgentButton, OpenDetails } from "@/components/gallery/CardButtons";

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
  sections?: { key: string; name: string; items: GalleryItem[] }[];
  onSite?: (key: string) => void;
  onStar?: (item: GalleryItem) => void;
  tools?: (item: GalleryItem) => React.ReactNode;
  intro?: boolean;
  onDeal?: (ms: number) => void;
  onAgent?: (text: string) => void;
}) {
  const [trigger, setTrigger] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const more = useRef<HTMLDivElement>(null);

  const libName = useMemo(() => new Map(libraries.map((l) => [l.id, l.name])), [libraries]);
  const nameOf = (i: GalleryItem) => i.site ?? libName.get(i.library) ?? i.library;

  const filtered = useMemo(
    () => (trigger ? items.filter((i) => i.triggers.includes(trigger)) : items),
    [items, trigger],
  );

  const triggerCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of items) for (const t of i.triggers) m.set(t, (m.get(t) ?? 0) + 1);
    return m;
  }, [items]);

  const root = useRef<HTMLElement>(null);
  const before = useRef<Map<string, DOMRect> | null>(null);
  const star =
    onStar &&
    ((i: GalleryItem) => {
      const m = new Map<string, DOMRect>();
      root.current
        ?.querySelectorAll<HTMLElement>("[data-card]")
        .forEach((el) => m.set(el.dataset.card!, el.getBoundingClientRect()));
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
        el.animate(
          [
            { opacity: 0, transform: "scale(.96)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 320, easing },
        );
        return;
      }
      const now = el.getBoundingClientRect();
      const dx = was.left - now.left;
      const dy = was.top - now.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      const duration = Math.min(700, 380 + Math.hypot(dx, dy) * 0.25);
      el.style.position = "relative";
      el.style.zIndex = "2";
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration, easing }).onfinish =
        () => {
          el.style.position = "";
          el.style.zIndex = "";
        };
    });
  }, [items]);

  const dealtRef = useRef(false);
  useLayoutEffect(() => {
    if (!intro || dealtRef.current || !root.current?.querySelector("[data-card]")) return;
    dealtRef.current = true;
    onDeal?.(deal(root.current));
  }, [intro, items, sections]);

  useEffect(() => setShown(PAGE), [items, trigger]);
  useEffect(() => {
    const el = more.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setShown((n) => n + PAGE), {
      rootMargin: "800px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [filtered.length]);

  return (
    <section ref={root}>
      <div
        data-chrome
        style={{ "--d": "120ms" } as React.CSSProperties}
        className="sticky top-14 z-[9] -mx-4 mb-5 bg-bg/90 px-4 backdrop-blur-md md:mx-0 md:px-0"
      >
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
              <button
                data-chrome
                style={{ "--d": "160ms" } as React.CSSProperties}
                onClick={() => onSite?.(sec.key)}
                className="group mb-3 flex items-baseline gap-2 text-left"
              >
                <span className="font-medium">{sec.name}</span>
                <span className="text-faint tabular-nums">{sec.items.length}</span>
                <span className="text-[12px] text-faint opacity-0 transition group-hover:opacity-100">View all</span>
              </button>
              <div data-grid className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 xl:grid-cols-3">
                {sec.items.slice(0, 4).map((i, n) => (
                  <div key={i.id} className={n === 3 ? "xl:hidden" : undefined}>
                    <ComponentCard
                      item={i}
                      site={nameOf(i)}
                      onOpen={() => onOpen(i)}
                      onStar={star && (() => star(i))}
                      tools={tools?.(i)}
                      onAgent={onAgent && (() => onAgent(agentText(i, nameOf(i))))}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        (empty ?? <p className="pt-16 text-center text-muted">Nothing here yet.</p>)
      ) : (
        <div data-grid className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.slice(0, shown).map((i) => (
            <ComponentCard
              key={i.id}
              item={i}
              site={nameOf(i)}
              onOpen={() => onOpen(i)}
              onStar={star && (() => star(i))}
              tools={tools?.(i)}
              onAgent={onAgent && (() => onAgent(agentText(i, nameOf(i))))}
            />
          ))}
        </div>
      )}
      {shown < filtered.length && <div ref={more} className="h-24" />}
    </section>
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
  const [pop, setPop] = useState(false);
  const live = useCardLive(Boolean(item.live));
  const [picked, setPicked] = useState<Picked>({});
  return (
    <article data-card={item.id} className="group pop">
      <div ref={live.ref} className="relative">
        <div className="relative block aspect-[16/10] w-full overflow-hidden rounded-lg bg-hover ring-1 ring-line ring-inset">
          <Preview item={item} site={site} />
          {live.on && item.live && (
            <LiveDemo live={item.live} title={item.title} card picked={picked} onReady={live.ready} />
          )}
        </div>
        {item.live?.variants && (
          <VariantsMenu groups={item.live.variants} picked={picked} onPick={setPicked} onOpenChange={live.hold} />
        )}
        <OpenDetails onClick={onOpen} />
        {onStar && (
          <Tip label={starred ? "Remove from Starred" : "Star"}>
            <button
              type="button"
              data-star
              onClick={(e) => {
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
            {[...new Set([typeById(item.type).name, ...item.triggers.map((t) => triggerById(t)?.name ?? t)])].join(
              " · ",
            )}
          </p>
          <span className="shrink-0 text-[12px] text-faint">{site}</span>
        </div>
      </div>
    </article>
  );
}
