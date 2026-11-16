"use client";

import { useEffect, useState } from "react";

export function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setDark(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return dark;
}
export function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduce(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduce;
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
