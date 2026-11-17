"use client";

import { useCallback, useRef, useState } from "react";

export type ToastMessage = { msg: string; undo?: () => void };

const SHOWN_MS = 1600;
const SHOWN_WITH_UNDO_MS = 4000;

export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const flash = useCallback((msg: string, undo?: () => void) => {
    setToast({ msg, undo });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), undo ? SHOWN_WITH_UNDO_MS : SHOWN_MS);
  }, []);

  const dismiss = useCallback(() => setToast(null), []);

  return { toast, flash, dismiss };
}

export type Flash = ReturnType<typeof useToast>["flash"];
