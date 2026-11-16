"use client";

import { useEffect, useEffectEvent, useState } from "react";
import type { Bookmark } from "@/lib/store";

const CARD_WIDTH = 340;

export function useGridKeys(cards: Bookmark[], { paused, resetOn }: { paused: boolean; resetOn: string }) {
  const [selected, setSelected] = useState(-1);
  const [selectionFor, setSelectionFor] = useState(resetOn);
  if (selectionFor !== resetOn) {
    setSelectionFor(resetOn);
    setSelected(-1);
  }

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (paused || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target instanceof Element && e.target.closest("input, textarea, select")) return;
    if (!cards.length) return;
    const gridWidth = document.querySelector("[data-grid]")?.clientWidth ?? 1;
    const cols = Math.max(1, Math.round(gridWidth / CARD_WIDTH));
    const move = (d: number) => {
      e.preventDefault();
      const n = Math.min(cards.length - 1, Math.max(0, (selected < 0 ? -d : selected) + d));
      setSelected(n);
      document.querySelector(`[data-card="${cards[n].id}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };
    const press = (id: string, control: string) =>
      document.querySelector<HTMLButtonElement>(`[data-card="${id}"] [${control}]`)?.click();
    const card = cards[selected];
    if (e.key === "ArrowRight" || e.key === "l") move(1);
    else if (e.key === "ArrowLeft" || e.key === "h") move(-1);
    else if (e.key === "ArrowDown" || e.key === "j") move(cols);
    else if (e.key === "ArrowUp" || e.key === "k") move(-cols);
    else if (e.key === "Escape") setSelected(-1);
    else if (card && e.key === "Enter") window.open(card.url, "_blank", "noopener");
    else if (card && e.key === "c") press(card.id, "data-copy");
    else if (card && (e.key === "Backspace" || e.key === "Delete")) press(card.id, "data-star");
  });

  useEffect(() => {
    const key = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  return selected;
}
