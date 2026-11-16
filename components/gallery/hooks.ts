"use client";

import { useSyncExternalStore } from "react";

function useMedia(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
export function useDark() {
  return useMedia("(prefers-color-scheme: dark)");
}
export function useReducedMotion() {
  return useMedia("(prefers-reduced-motion: reduce)");
}
const onScreen = new Map<Element, (visible: boolean) => void>();
let screenObserver: IntersectionObserver | undefined;
export function watchOnScreen(el: Element, cb: (visible: boolean) => void) {
  screenObserver ??= new IntersectionObserver(
    (entries) => entries.forEach((e) => onScreen.get(e.target)?.(e.isIntersecting)),
    { rootMargin: "200px 0px" },
  );
  onScreen.set(el, cb);
  screenObserver.observe(el);
  return () => {
    onScreen.delete(el);
    screenObserver?.unobserve(el);
  };
}
