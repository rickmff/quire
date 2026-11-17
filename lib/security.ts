import "server-only";

export type Suspicious = { reason: string; route: string; client: string; detail?: string };

export function logSuspicious(event: Suspicious) {
  console.warn(JSON.stringify({ level: "warn", kind: "security", at: new Date().toISOString(), ...event }));
}

export function isCrossSite(req: Request) {
  const site = req.headers.get("sec-fetch-site");
  if (site === "cross-site" || site === "same-site") return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}
