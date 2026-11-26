export type ClientError = { message: string; stack?: string; digest?: string; path: string; source: string };

const MAX_BODY = 8_000;

const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);

export function parseClientError(raw: string): ClientError | null {
  if (raw.length > MAX_BODY) return null;
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    const message = text(v.message, 500);
    const path = text(v.path, 300);
    if (!message || !path?.startsWith("/")) return null;
    return {
      message,
      path,
      source: text(v.source, 40) ?? "window",
      ...(text(v.stack, 2000) ? { stack: text(v.stack, 2000) } : {}),
      ...(text(v.digest, 100) ? { digest: text(v.digest, 100) } : {}),
    };
  } catch {
    return null;
  }
}

export function reportClientError(error: { message?: string; stack?: string; digest?: string }, source: string) {
  try {
    const body = JSON.stringify({
      message: error.message ?? String(error),
      stack: error.stack,
      digest: error.digest,
      path: location.pathname,
      source,
    });
    if (!navigator.sendBeacon?.("/api/client-error", new Blob([body], { type: "application/json" })))
      void fetch("/api/client-error", {
        method: "POST",
        body,
        keepalive: true,
        headers: { "content-type": "application/json" },
      });
  } catch {}
}
