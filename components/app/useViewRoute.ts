"use client";

import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import { type View, pathView, viewPath } from "@/lib/view";

export function useViewRoute() {
  const pathname = usePathname();
  const [view, setViewState] = useState<View>(() => pathView(pathname));
  const [routedPath, setRoutedPath] = useState(pathname);
  if (pathname !== routedPath) {
    setRoutedPath(pathname);
    setViewState(pathView(pathname));
  }

  const setView = useCallback((v: View) => {
    const next = v === "all" || v === "library" ? "starred" : v;
    setViewState(next);
    const path = viewPath(next);
    if (path !== window.location.pathname) window.history.pushState(null, "", path);
  }, []);

  return [view, setView] as const;
}
