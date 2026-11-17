"use client";

import { useEffect, useState } from "react";
import type { Point } from "@/components/gallery/types";

let liveCard: (() => void) | undefined;
const pointer = { x: 0, y: 0, t: 0, v: Infinity, on: false };
function trackPointer() {
  if (pointer.on) return;
  pointer.on = true;
  document.addEventListener(
    "pointermove",
    (e) => {
      const dt = e.timeStamp - pointer.t;
      const d = Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y);
      pointer.v = dt > 100 ? d / 16 : dt > 0 ? pointer.v * 0.5 + (d / dt) * 0.5 : pointer.v;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.t = e.timeStamp;
    },
    { passive: true, capture: true },
  );
}
const SLOW = 0.35;
const REST = 50;
const DWELL = 300;
const GRACE = 250;
const NEAR = 150;
type Demo = "off" | "loading" | "shown";
type Timer = "rest" | "dwell" | "grace";

function cardLive(setDemo: (d: Demo) => void) {
  const live = {
    el: null as HTMLDivElement | null,
    inside: false,
    held: false,
    demo: "off" as Demo,
    timers: {} as Partial<Record<Timer, ReturnType<typeof setTimeout>>>,
    attach: (el: HTMLDivElement | null) => {
      live.el = el;
    },
    to: (d: Demo) => {
      live.demo = d;
      setDemo(d);
    },
    clear: (...names: Timer[]) => names.forEach((n) => clearTimeout(live.timers[n])),
    stop: () => live.to("off"),
    start: () => {
      live.clear("rest", "dwell", "grace");
      if (liveCard !== live.stop) liveCard?.();
      liveCard = live.stop;
      if (live.demo === "off") live.to("loading");
    },
    end: () => {
      live.clear("rest", "dwell", "grace");
      const off = () => {
        if (live.held || live.inside) return;
        if (liveCard === live.stop) liveCard = undefined;
        live.stop();
      };
      if (live.demo !== "shown") return off();
      live.timers.grace = setTimeout(off, GRACE);
    },
    ready: () => {
      if (live.demo === "loading") live.to("shown");
    },
    near: (at: Point, margin = NEAR) => {
      const r = live.el?.getBoundingClientRect();
      return Boolean(
        r && at.x >= r.left - margin && at.x <= r.right + margin && at.y >= r.top - margin && at.y <= r.bottom + margin,
      );
    },
    watch: (e: PointerEvent) => {
      if (live.near({ x: e.clientX, y: e.clientY })) return;
      document.removeEventListener("pointermove", live.watch);
      live.inside = false;
      live.end();
    },
    hold: (held: boolean, at?: Point) => {
      live.held = held;
      live.clear("rest", "grace");
      if (held) return live.start();
      if (at) live.inside = live.near(at);
      if (live.inside) document.addEventListener("pointermove", live.watch);
      live.end();
    },
    listen: () => {
      const el = live.el;
      if (!el) return;
      trackPointer();
      const enter = (e: PointerEvent) => {
        if (e.pointerType === "touch") return;
        live.inside = true;
        document.removeEventListener("pointermove", live.watch);
        live.clear("rest", "dwell", "grace");
        if (e.timeStamp - pointer.t < 100 && pointer.v < SLOW) return live.start();
        live.timers.rest = setTimeout(live.start, REST);
        live.timers.dwell = setTimeout(live.start, DWELL);
      };
      const move = (e: PointerEvent) => {
        if (e.pointerType === "touch" || !live.inside || liveCard === live.stop) return;
        live.clear("rest", "grace");
        if (pointer.v < SLOW) return live.start();
        live.timers.rest = setTimeout(live.start, REST);
      };
      const leave = () => {
        live.inside = false;
        live.end();
      };
      el.addEventListener("pointerenter", enter);
      el.addEventListener("pointermove", move, { passive: true });
      el.addEventListener("pointerleave", leave);
      return () => {
        el.removeEventListener("pointerenter", enter);
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", leave);
        document.removeEventListener("pointermove", live.watch);
        live.clear("rest", "dwell", "grace");
        if (liveCard === live.stop) liveCard = undefined;
      };
    },
  };
  return live;
}

export function useCardLive(enabled: boolean) {
  const [demo, setDemo] = useState<Demo>("off");
  const [live] = useState(() => cardLive(setDemo));
  useEffect(() => (enabled ? live.listen() : undefined), [enabled, live]);
  return { on: enabled && demo !== "off", attach: live.attach, ready: live.ready, hold: live.hold };
}
