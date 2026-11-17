"use client";

import { useSyncExternalStore } from "react";

export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
export const DARK_SCHEME = "(prefers-color-scheme: dark)";

export const prefersReducedMotion = () => window.matchMedia(REDUCED_MOTION).matches;
export const prefersDark = () => window.matchMedia(DARK_SCHEME).matches;

export function useMedia<Server extends boolean | null>(query: string, onServer: Server) {
  return useSyncExternalStore<boolean | Server>(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => onServer,
  );
}

export const useDark = () => useMedia(DARK_SCHEME, false);
export const useReducedMotion = () => useMedia(REDUCED_MOTION, false);
