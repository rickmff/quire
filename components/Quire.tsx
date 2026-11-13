"use client";

import { useEffect, useRef } from "react";
import s from "./Landing.module.css";

const SHEETS = 7;

/** A stack of holographic sheets that follows the pointer and fans open as it comes near. */
export default function Quire() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = ref.current;
    if (!scene) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let tx = 0, ty = 0, x = 0, y = 0, near = 0, o = 0, raf = 0;
    const t0 = performance.now();

    const move = (e: PointerEvent) => {
      tx = (e.clientX / innerWidth) * 2 - 1;
      ty = (e.clientY / innerHeight) * 2 - 1;
      const r = scene.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      near = Math.max(0, 1 - Math.hypot(dx, dy) / 1.1);
    };
    const leave = () => { tx = ty = near = 0; };

    const frame = (now: number) => {
      const t = (now - t0) / 1000;
      x += (tx - x) * 0.06;
      y += (ty - y) * 0.06;
      o += (near - o) * 0.07;
      const breathe = reduce ? 0 : Math.sin(t * 0.9) * 0.5 + 0.5;
      const st = scene.style;
      st.setProperty("--px", x.toFixed(3));
      st.setProperty("--py", y.toFixed(3));
      st.setProperty("--rz", `${(x * 8).toFixed(2)}deg`);
      st.setProperty("--ry", `${(-y * 6).toFixed(2)}deg`);
      st.setProperty("--gap", `${(11 + breathe * 3 + o * 22).toFixed(2)}px`);
      st.setProperty("--fan", `${(o * 2.2).toFixed(2)}deg`);
      st.setProperty("--h", `${((reduce ? 0 : t * 14) + x * 90).toFixed(1)}deg`);
      raf = requestAnimationFrame(frame);
    };

    addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div ref={ref} className={s.scene} aria-hidden="true">
      <div className={s.floor} />
      <div className={s.stack}>
        {Array.from({ length: SHEETS }, (_, i) => (
          <div key={i} className={s.sheet} style={{ "--i": i } as React.CSSProperties} />
        ))}
      </div>
    </div>
  );
}
