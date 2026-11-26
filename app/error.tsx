"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/clientError";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => reportClientError(error, "boundary"), [error]);
  return (
    <main id="main" tabIndex={-1} className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <h1 className="text-lg font-medium">Something broke on this page.</h1>
        <p className="mt-2 text-muted">It has been reported. Your library is safe in this browser.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-md bg-fg px-3 py-1.5 text-[13px] text-bg transition hover:opacity-80"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
