"use client";

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
