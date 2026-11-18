import "server-only";
import { timingSafeEqual } from "node:crypto";
import { type Redis, redis } from "./redis";
import { logSuspicious } from "./security";

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

export const PROXY_HEADER = "x-quire-proxy";

function sameSecret(given: string, expected: string) {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function clientAddress(req: Request, proxySecret = process.env.QUIRE_PROXY_SECRET) {
  const viaProxy = proxySecret && sameSecret(req.headers.get(PROXY_HEADER) ?? "", proxySecret);
  const proxied = viaProxy ? req.headers.get("cf-connecting-ip") : null;
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return proxied || req.headers.get("x-real-ip") || forwarded || "unknown";
}

export function createSharedRateLimiter(
  db: Redis,
  name: string,
  { max, windowMs }: Window,
  now: () => number = Date.now,
) {
  return async (client: string): Promise<Verdict> => {
    const at = now();
    const window = Math.floor(at / windowMs);
    const key = `rl:${name}:${window}:${client}`;
    const [count] = (await db.pipeline([
      ["INCR", key],
      ["PEXPIRE", key, windowMs],
    ])) as [number, number];
    if (count <= max) return { ok: true };
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil(((window + 1) * windowMs - at) / 1000)) };
  };
}

const MINUTE = 60_000;

export const ROUTE_LIMITS = {
  fetch: { max: 30, windowMs: MINUTE },
  capture: { max: 6, windowMs: MINUTE },
  write: { max: 20, windowMs: MINUTE },
  read: { max: 60, windowMs: MINUTE },
  mcp: { max: 120, windowMs: MINUTE },
} satisfies Record<string, Window>;

export type RouteLimit = keyof typeof ROUTE_LIMITS;

const local = Object.fromEntries(
  Object.entries(ROUTE_LIMITS).map(([name, window]) => [name, createRateLimiter(window)]),
) as Record<RouteLimit, ReturnType<typeof createRateLimiter>>;

async function check(route: RouteLimit, client: string): Promise<Verdict> {
  const db = redis();
  if (!db) return local[route](client);
  try {
    return await createSharedRateLimiter(db, route, ROUTE_LIMITS[route])(client);
  } catch {
    return local[route](client);
  }
}

export async function rateLimited(req: Request, route: RouteLimit, extraHeaders: Record<string, string> = {}) {
  const client = clientAddress(req);
  const verdict = await check(route, client);
  if (verdict.ok) return null;
  logSuspicious({ reason: "rate-limited", route, client });
  return Response.json(
    { error: "rate-limited" },
    { status: 429, headers: { "retry-after": String(verdict.retryAfterSec), ...extraHeaders } },
  );
}
