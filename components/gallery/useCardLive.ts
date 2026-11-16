"use client";

import { useEffect, useRef, useState } from "react";
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
type Demo = "off" | "loading" | "shown";
export function useCardLive(enabled: boolean) {
  const [demo, setDemo] = useState<Demo>("off");
  const ref = useRef<HTMLDivElement>(null);
  const timers = useRef<{
    rest?: ReturnType<typeof setTimeout>;
    dwell?: ReturnType<typeof setTimeout>;
    grace?: ReturnType<typeof setTimeout>;
  }>({});
  const state = useRef<{ inside: boolean; held: boolean; demo: Demo }>({ inside: false, held: false, demo: "off" });
  const [fns] = useState(() => {
    const to = (d: Demo) => {
      state.current.demo = d;
      setDemo(d);
    };
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
      if (state.current.demo !== "shown") return off();
      timers.current.grace = setTimeout(off, 250);
    };
    const ready = () => {
      if (state.current.demo === "loading") to("shown");
    };
    const near = (at: Point, m = 150) => {
      const r = ref.current?.getBoundingClientRect();
      return Boolean(r && at.x >= r.left - m && at.x <= r.right + m && at.y >= r.top - m && at.y <= r.bottom + m);
    };
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
    const enter = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      state.current.inside = true;
      document.removeEventListener("pointermove", watch);
      clear("rest", "dwell", "grace");
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
    ready: fns.ready,
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
