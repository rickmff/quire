"use client";

import { useCallback, useEffect, useState } from "react";

// The entrance /app plays on every entry (a refresh, or arriving from the landing).
//
//   wait ──dealt(ms)──▶ deal ──ms──▶ show ──900ms──▶ done
//     │                                ▲
//     ├──skip() or 1600ms──────────────┘   nothing to deal, or the catalog is slow
//     └──reduced motion──▶ done
//
// wait: the chrome is hidden until the gallery has its cards and deals them.
// deal: the cards are in flight; the chrome waits for the last one to land.
// show: the sidebar and headers rise in.
// done: no entrance; later views mount as they are.
//
// The phase is also the page's data-intro attribute (none when done), which
// globals.css uses to hide and then raise the chrome.
export type IntroPhase = "wait" | "deal" | "show" | "done";

const FALLBACK = 1600; // ms in wait before the page shows without a deal
const RISE = 900; // ms for the chrome to rise in

export function useIntro() {
  const [state, setState] = useState<{ phase: IntroPhase; ms: number }>({ phase: "wait", ms: 0 });
  // Moves only from the phase it expects, so a late timer or a second call does nothing.
  const move = useCallback((from: IntroPhase, to: IntroPhase, ms = 0) => {
    setState((s) => (s.phase === from ? { phase: to, ms } : s));
  }, []);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (state.phase === "wait") {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) move("wait", "done");
      else t = setTimeout(() => move("wait", "show"), FALLBACK);
    } else if (state.phase === "deal") t = setTimeout(() => move("deal", "show"), state.ms);
    else if (state.phase === "show") t = setTimeout(() => move("show", "done"), RISE);
    return () => clearTimeout(t);
  }, [state, move]);

  return {
    phase: state.phase,
    // The gallery dealt its cards; ms until the last one lands.
    dealt: useCallback((ms: number) => move("wait", "deal", ms), [move]),
    // Nothing to deal (another view, an empty Starred): show the page now.
    skip: useCallback(() => move("wait", "show"), [move]),
  };
}
