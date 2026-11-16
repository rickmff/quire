"use client";

import { useEffect, useEffectEvent } from "react";
import { normalizeUrl } from "@/lib/store";

export type BarMode = "search" | "add";

const isTypingIn = (target: EventTarget | null, fields = "input, textarea, select") =>
  target instanceof Element && target.closest(fields) !== null;

export function useShortcuts({
  togglePalette,
  focusBar,
  addLink,
}: {
  togglePalette: () => void;
  focusBar: (mode: BarMode) => void;
  addLink: (url: string) => void;
}) {
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    const typing = isTypingIn(e.target);
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      togglePalette();
    } else if ((e.key === "/" || e.key === "+") && !typing) {
      e.preventDefault();
      focusBar(e.key === "/" ? "search" : "add");
    } else if (e.key === "Escape" && typing) {
      (e.target as HTMLElement).blur();
    }
  });

  const onPaste = useEffectEvent((e: ClipboardEvent) => {
    if (isTypingIn(e.target, "input, textarea")) return;
    const text = e.clipboardData?.getData("text") ?? "";
    if (normalizeUrl(text)) {
      e.preventDefault();
      addLink(text);
    }
  });

  useEffect(() => {
    const key = (e: KeyboardEvent) => onKey(e);
    const paste = (e: ClipboardEvent) => onPaste(e);
    window.addEventListener("keydown", key);
    window.addEventListener("paste", paste);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("paste", paste);
    };
  }, []);
}
