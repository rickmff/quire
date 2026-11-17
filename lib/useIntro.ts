"use client";

import { useCallback, useEffect, useState } from "react";
import { REDUCED_MOTION, useMedia } from "@/lib/media";

export type IntroPhase = "wait" | "deal" | "show" | "done";

const FALLBACK_MS = 1600;
const RISE_MS = 900;

export function useIntro({ nothingToDeal }: { nothingToDeal: boolean }) {
  const [state, setState] = useState<{ phase: IntroPhase; ms: number }>({ phase: "wait", ms: 0 });
  const reducedMotion = useMedia(REDUCED_MOTION, null);

  if (state.phase === "wait" && reducedMotion) setState({ phase: "done", ms: 0 });
  else if (state.phase === "wait" && reducedMotion === false && nothingToDeal) setState({ phase: "show", ms: 0 });

  const move = useCallback((from: IntroPhase, to: IntroPhase, ms = 0) => {
    setState((s) => (s.phase === from ? { phase: to, ms } : s));
  }, []);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (state.phase === "wait") t = setTimeout(() => move("wait", "show"), FALLBACK_MS);
    else if (state.phase === "deal") t = setTimeout(() => move("deal", "show"), state.ms);
    else if (state.phase === "show") t = setTimeout(() => move("show", "done"), RISE_MS);
    return () => clearTimeout(t);
  }, [state, move]);

  return {
    phase: state.phase,
    dealt: useCallback((ms: number) => move("wait", "deal", ms), [move]),
  };
}
