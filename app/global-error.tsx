"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/clientError";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => reportClientError(error, "global"), [error]);
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0b0b0b", color: "#ececec", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ display: "grid", minHeight: "100dvh", placeItems: "center", textAlign: "center", padding: 24 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 500 }}>Quire could not load.</h1>
            <p style={{ color: "#a1a1a1" }}>It has been reported. Your library is safe in this browser.</p>
            <button
              type="button"
              onClick={reset}
              style={{ marginTop: 16, padding: "6px 12px", borderRadius: 6, border: 0, background: "#ececec" }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
