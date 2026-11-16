"use client";

import { useCallback, useEffect, useState } from "react";

export type IntroPhase = "wait" | "deal" | "show" | "done";

const FALLBACK = 1600;
const RISE = 900;

export function useIntro() {
  const [state, setState] = useState<{ phase: IntroPhase; ms: number }>({ phase: "wait", ms: 0 });
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
    dealt: useCallback((ms: number) => move("wait", "deal", ms), [move]),
    skip: useCallback(() => move("wait", "show"), [move]),
  };
}
