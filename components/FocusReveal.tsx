"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import s from "./Landing.module.css";

type Part = { text: string; muted?: boolean };
type Box = { x: number; y: number; w: number; h: number };

const STEP = 230;
const PAD_X = 6,
  PAD_Y = 3;

export default function FocusReveal({ parts, className }: { parts: Part[]; className?: string }) {
  const words = parts.flatMap((p) => p.text.split(" ").map((w) => ({ w, muted: !!p.muted })));
  const root = useRef<HTMLHeadingElement>(null);
  const [at, setAt] = useState(-1);
  const [hover, setHover] = useState(-1);
  const [box, setBox] = useState<Box | null>(null);
  const [still, setStill] = useState(false);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStill(true);
      setAt(words.length);
      return;
    }
    let i = -1,
      timer = 0;
    const tick = () => {
      i++;
      setAt(i);
      if (i < words.length) timer = window.setTimeout(tick, STEP);
    };
    timer = window.setTimeout(tick, 650);
    return () => clearTimeout(timer);
  }, [words.length]);

  const done = at >= words.length;
  const focus = done ? hover : at;

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const place = () => {
      const w = el.querySelector<HTMLElement>(`[data-i="${focus}"]`);
      if (w)
        setBox({
          x: w.offsetLeft - PAD_X,
          y: w.offsetTop - PAD_Y,
          w: w.offsetWidth + PAD_X * 2,
          h: w.offsetHeight + PAD_Y * 2,
        });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    return () => ro.disconnect();
  }, [focus]);

  return (
    <h1
      ref={root}
      className={`${s.title} ${s.reveal} ${className ?? ""}`}
      aria-label={parts.map((p) => p.text).join(" ")}
      onPointerLeave={() => setHover(-1)}
    >
      <noscript>
        <style>{`[data-fr]{filter:none!important;opacity:1!important}`}</style>
      </noscript>
      {words.map(({ w, muted }, i) => {
        const soft = done ? hover >= 0 && hover !== i && !still : i > at;
        return (
          <span key={i} aria-hidden="true">
            <span
              data-fr
              data-i={i}
              className={`${s.word} ${muted ? s.wordMuted : ""} ${soft ? (done ? s.wordSoft : s.wordBlur) : ""}`}
              onPointerEnter={() => done && setHover(i)}
            >
              {w}
            </span>
            {i < words.length - 1 ? " " : ""}
          </span>
        );
      })}
      {box && (
        <span
          aria-hidden="true"
          className={`${s.frame} ${focus >= 0 && focus < words.length ? s.frameOn : ""}`}
          style={{ transform: `translate(${box.x}px, ${box.y}px)`, width: box.w, height: box.h }}
        >
          <i />
          <i />
          <i />
          <i />
        </span>
      )}
    </h1>
  );
}
