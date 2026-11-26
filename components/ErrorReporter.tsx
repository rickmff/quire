"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/clientError";

export default function ErrorReporter() {
  useEffect(() => {
    let sent = 0;
    const send = (error: unknown, source: string) => {
      if (sent++ >= 5) return;
      reportClientError(error instanceof Error ? error : { message: String(error) }, source);
    };
    const onError = (e: ErrorEvent) => send(e.error ?? e.message, "window");
    const onRejection = (e: PromiseRejectionEvent) => send(e.reason, "promise");
    addEventListener("error", onError);
    addEventListener("unhandledrejection", onRejection);
    return () => {
      removeEventListener("error", onError);
      removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
