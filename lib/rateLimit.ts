export type Window = { max: number; windowMs: number };

type Bucket = { count: number; resetAt: number };

export type Verdict = { ok: true } | { ok: false; retryAfterSec: number };

const MAX_TRACKED_CLIENTS = 10_000;

export function createRateLimiter({ max, windowMs }: Window, now: () => number = Date.now) {
  const buckets = new Map<string, Bucket>();

  const dropExpired = (at: number) => {
    for (const [key, bucket] of buckets) if (bucket.resetAt <= at) buckets.delete(key);
  };

  return (client: string): Verdict => {
    const at = now();
    if (buckets.size >= MAX_TRACKED_CLIENTS) dropExpired(at);
    const bucket = buckets.get(client);
    if (!bucket || bucket.resetAt <= at) {
      buckets.set(client, { count: 1, resetAt: at + windowMs });
      return { ok: true };
    }
    if (bucket.count >= max) return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - at) / 1000)) };
    bucket.count++;
    return { ok: true };
  };
}

export function clientAddress(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? forwarded ?? "unknown";
}

const MINUTE = 60_000;

export const ROUTE_LIMITS = {
  fetch: { max: 30, windowMs: MINUTE },
  capture: { max: 6, windowMs: MINUTE },
  write: { max: 20, windowMs: MINUTE },
  mcp: { max: 120, windowMs: MINUTE },
} satisfies Record<string, Window>;

export type RouteLimit = keyof typeof ROUTE_LIMITS;

const limiters = Object.fromEntries(
  Object.entries(ROUTE_LIMITS).map(([name, window]) => [name, createRateLimiter(window)]),
) as Record<RouteLimit, ReturnType<typeof createRateLimiter>>;

export function rateLimited(req: Request, route: RouteLimit, extraHeaders: Record<string, string> = {}) {
  const verdict = limiters[route](clientAddress(req));
  if (verdict.ok) return null;
  return Response.json(
    { error: "rate-limited" },
    { status: 429, headers: { "retry-after": String(verdict.retryAfterSec), ...extraHeaders } },
  );
}
