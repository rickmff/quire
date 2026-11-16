import { useRef, useState } from "react";

type SiteDrag = { key: string; from: number; to: number; dy: number; heights: number[]; settling?: boolean };
export function shiftFor(d: SiteDrag, i: number) {
  const h = d.heights[d.from];
  if (d.from < d.to && i > d.from && i <= d.to) return -h;
  if (d.from > d.to && i >= d.to && i < d.from) return h;
  return 0;
}
export function useSiteDrag(keys: string[], onReorder: (keys: string[]) => void) {
  const [drag, setDrag] = useState<SiteDrag | null>(null);
  const blocks = useRef(new Map<string, HTMLDivElement>());
  const swallow = useRef(false);
  const busy = useRef(false);
  const latest = useRef({ keys, onReorder });
  latest.current = { keys, onReorder };

  const blockRef = (key: string) => (el: HTMLDivElement | null) => {
    if (el) blocks.current.set(key, el);
    else blocks.current.delete(key);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>, key: string) => {
    if (e.button !== 0 || busy.current || !window.matchMedia("(min-width: 768px)").matches) return;
    if ((e.target as HTMLElement).closest("button")?.parentElement !== e.currentTarget) return;
    const order = latest.current.keys;
    const from = order.indexOf(key);
    const rects = order.map((k) => blocks.current.get(k)?.getBoundingClientRect());
    if (from < 0 || order.length < 2 || rects.some((r) => !r)) return;
    const heights = rects.map((r) => r!.height);
    const centers = rects.map((r) => r!.top + Math.min(r!.height, 28) / 2);
    const y0 = e.clientY;
    let current: SiteDrag | null = null;

    const move = (ev: PointerEvent) => {
      const dy = ev.clientY - y0;
      if (!current && Math.abs(dy) < 4) return;
      if (!current) {
        busy.current = true;
        document.documentElement.classList.add("dragging-site");
      }
      ev.preventDefault();
      const c = centers[from] + dy;
      let to = 0;
      for (let i = 0; i < centers.length; i++) if (i !== from && centers[i] < c) to++;
      current = { key, from, to, dy, heights };
      setDrag(current);
    };
    const end = (cancel: boolean) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("dragging-site");
      if (!current) return;
      swallow.current = true;
      setTimeout(() => (swallow.current = false), 0);
      const d = current;
      const to = cancel ? d.from : d.to;
      let slot = 0;
      if (to > d.from) for (let i = d.from + 1; i <= to; i++) slot += heights[i];
      else for (let i = to; i < d.from; i++) slot -= heights[i];
      setDrag({ ...d, to, dy: slot, settling: true });
      setTimeout(() => {
        if (to !== d.from) {
          const next = [...latest.current.keys];
          const [k] = next.splice(d.from, 1);
          next.splice(to, 0, k);
          latest.current.onReorder(next);
        }
        setDrag(null);
        busy.current = false;
      }, 160);
    };
    const up = () => end(false);
    const onCancel = () => end(true);
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") end(true);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey);
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (!swallow.current) return;
    e.preventDefault();
    e.stopPropagation();
  };

  return { drag, blockRef, onPointerDown, onClickCapture };
}
