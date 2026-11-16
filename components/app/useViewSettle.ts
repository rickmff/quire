"use client";

import { type RefObject, useLayoutEffect, useRef } from "react";
import type { View } from "@/lib/view";

const SETTLING = "h1, section > button[data-chrome], [data-grid] > *";
const DURATION_MS = 360;
const STAGGER_MS = 28;
const MAX_STAGGERED = 10;

export function useViewSettle(main: RefObject<HTMLElement | null>, view: View, enabled: boolean) {
  const shownView = useRef(view);
  useLayoutEffect(() => {
    if (shownView.current === view) return;
    shownView.current = view;
    const root = main.current;
    if (!root || !enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const vh = window.innerHeight;
    const inView = [...root.querySelectorAll<HTMLElement>(SETTLING)].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.top < vh && r.bottom > 0;
    });
    inView.forEach((el, i) =>
      el.animate(
        [
          { opacity: 0, transform: "translateY(8px) scale(.985)", filter: "blur(2px)" },
          { opacity: 1, transform: "none", filter: "none" },
        ],
        {
          duration: DURATION_MS,
          delay: Math.min(i, MAX_STAGGERED) * STAGGER_MS,
          easing: "cubic-bezier(.2,.8,.2,1)",
          fill: "backwards",
        },
      ),
    );
  }, [main, view, enabled]);
}
