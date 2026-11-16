"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { type LiveVariant } from "@/lib/catalog/schema";
import { Tip } from "@/components/ui/tooltip";
import { ringLayout } from "@/lib/ring";
import { ArrowLeft, Settings, X } from "lucide-react";
import type { Picked, Point } from "@/components/gallery/types";
import { current } from "@/components/gallery/variants";

type Menu = { kind: "closed" } | { kind: "open"; at: Point; group: number | null; grown: boolean };
let ruler: CanvasRenderingContext2D | null | undefined;
function pillSizes(labels: string[]) {
  if (ruler === undefined) ruler = document.createElement("canvas").getContext("2d");
  if (ruler) ruler.font = `11px ${getComputedStyle(document.body).fontFamily}`;
  return labels.map((l) => ({ w: Math.ceil((ruler ? ruler.measureText(l).width : l.length * 6.2) + 22), h: 24 }));
}
export function VariantsMenu({
  groups,
  picked,
  onPick,
  onOpenChange,
  always,
}: {
  groups: LiveVariant[];
  picked: Picked;
  onPick: (p: Picked) => void;
  onOpenChange?: (open: boolean, at?: { x: number; y: number }) => void;
  always?: boolean;
}) {
  const btn = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState<Menu>({ kind: "closed" });
  const one = groups.length === 1;
  const changed = groups.some((g) => g.key in picked && picked[g.key] !== (g.value ?? ""));
  const events = useRef({ onOpenChange });
  events.current = { onOpenChange };
  const mouse = useRef<{ x: number; y: number } | undefined>(undefined);
  const isOpen = menu.kind === "open";
  const open = (o: boolean) => {
    const r = btn.current?.getBoundingClientRect();
    setMenu(
      o && r
        ? {
            kind: "open",
            at: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
            group: one ? 0 : null,
            grown: false,
          }
        : { kind: "closed" },
    );
    events.current.onOpenChange?.(o, mouse.current);
  };
  const choose = (group: number | null) => setMenu((m) => (m.kind === "open" ? { ...m, group, grown: false } : m));
  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen]);
  const growing = menu.kind === "open" && !menu.grown;
  useEffect(() => {
    if (!growing) return;
    const f = requestAnimationFrame(() =>
      requestAnimationFrame(() => setMenu((m) => (m.kind === "open" ? { ...m, grown: true } : m))),
    );
    return () => cancelAnimationFrame(f);
  }, [growing]);

  const g = menu.kind === "open" && menu.group !== null ? groups[menu.group] : null;
  const items = g
    ? g.options.map((o) => ({
        label: o.label,
        active: current(g, picked) === o.value,
        pick: () => (onPick({ ...picked, [g.key]: o.value }), open(false)),
      }))
    : groups.map((x, i) => ({
        label: x.label,
        active: x.key in picked && picked[x.key] !== (x.value ?? ""),
        pick: () => choose(i),
      }));
  const labels = items.map((it) => it.label).join("\n");
  const ring = useMemo(() => (isOpen ? ringLayout(pillSizes(labels.split("\n"))) : null), [isOpen, labels]);
  const shown = menu.kind === "open" && menu.grown;
  let cx = 0,
    cy = 0;
  if (menu.kind === "open" && ring) {
    const m = 8;
    cx = Math.min(window.innerWidth - m - ring.box.right, Math.max(m - ring.box.left, menu.at.x));
    cy = Math.min(window.innerHeight - m - ring.box.bottom, Math.max(m - ring.box.top, menu.at.y));
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
          aria-expanded={isOpen}
          onClick={(e) => {
            stop(e);
            open(!isOpen);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={`absolute bottom-2 left-2 z-10 flex size-7 items-center justify-center rounded-md bg-bg/80 shadow-sm ring-1 ring-line backdrop-blur-sm transition hover:bg-bg hover:text-fg focus-visible:opacity-100 [@media(hover:none)]:opacity-100 ${
            isOpen || changed
              ? "text-fg opacity-100"
              : always
                ? "text-muted"
                : "text-muted opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
          }`}
        >
          <Settings
            size={14}
            strokeWidth={1.75}
            aria-hidden
            className={`transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`}
          />
          {changed && <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-[#F59F00] ring-2 ring-bg" />}
        </button>
      </Tip>
      {menu.kind === "open" &&
        ring &&
        createPortal(
          <div
            className="fixed inset-0 z-50"
            onPointerMove={(e) => (mouse.current = { x: e.clientX, y: e.clientY })}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => (stop(e), open(false))}
            role="menu"
            aria-label={g ? g.label : "Variants"}
          >
            <div
              aria-hidden
              style={{
                left: cx,
                top: cy,
                width: 2 * ring.reach + 24,
                height: 2 * ring.reach + 24,
                transform: `translate(-50%, -50%) scale(${shown ? 1 : 0.3})`,
              }}
              className={`pointer-events-none absolute rounded-full bg-bg/70 ring-1 ring-line backdrop-blur-[3px] transition-[transform,opacity] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] ${shown ? "opacity-100" : "opacity-0"}`}
            />
            {items.map((it, i) => {
              const p = ring.at[i] ?? { x: 0, y: 0 };
              const x = shown ? p.x : 0,
                y = shown ? p.y : 0;
              return (
                <button
                  key={`${menu.group}-${it.label}`}
                  type="button"
                  role="menuitemradio"
                  aria-checked={it.active}
                  onClick={(e) => (stop(e), it.pick())}
                  style={{
                    left: cx,
                    top: cy,
                    transform: `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${shown ? 1 : 0.4})`,
                    transitionDelay: shown ? `${i * 14}ms` : "0ms",
                  }}
                  className={`absolute rounded-full px-2.5 py-1 text-[11px] leading-4 whitespace-nowrap shadow-[0_6px_20px_-6px_rgb(0_0_0/0.35)] ring-1 transition-[transform,opacity,background-color] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] ${shown ? "opacity-100" : "opacity-0"} ${
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
              onClick={(e) => (stop(e), g && !one ? choose(null) : open(false))}
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
