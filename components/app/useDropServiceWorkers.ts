"use client";

import { useEffect } from "react";

export function useDropServiceWorkers() {
  useEffect(() => {
    navigator.serviceWorker
      ?.getRegistrations()
      .then((rs) => rs.forEach((r) => r.unregister()))
      .catch(() => {});
  }, []);
}
