import { describe, expect, it } from "vitest";
import type { Command, Redis } from "./redis";
import { clientAddress, createRateLimiter, createSharedRateLimiter, PROXY_HEADER } from "./rateLimit";

const clock = (start = 0) => {
  let at = start;
  return { now: () => at, advance: (ms: number) => (at += ms) };
};

describe("createRateLimiter", () => {
  it("lets a client through up to the limit, then refuses with the seconds left", () => {
    const time = clock();
    const allow = createRateLimiter({ max: 2, windowMs: 10_000 }, time.now);
    expect(allow("a")).toEqual({ ok: true });
    expect(allow("a")).toEqual({ ok: true });
    time.advance(2_500);
    expect(allow("a")).toEqual({ ok: false, retryAfterSec: 8 });
  });

  it("counts each client on its own", () => {
    const allow = createRateLimiter({ max: 1, windowMs: 1_000 }, clock().now);
    expect(allow("a").ok).toBe(true);
    expect(allow("b").ok).toBe(true);
    expect(allow("a").ok).toBe(false);
  });

  it("opens a fresh window once the old one ends", () => {
    const time = clock();
    const allow = createRateLimiter({ max: 1, windowMs: 1_000 }, time.now);
    allow("a");
    expect(allow("a").ok).toBe(false);
    time.advance(1_000);
    expect(allow("a").ok).toBe(true);
  });
});

function fakeRedis(): Redis {
  const counts = new Map<string, number>();
  const exec = ([name, key]: Command) => {
    if (name !== "INCR") return 1;
    const next = (counts.get(String(key)) ?? 0) + 1;
    counts.set(String(key), next);
    return next;
  };
  return { run: async (cmd) => exec(cmd), pipeline: async (cmds) => cmds.map(exec) };
}

describe("createSharedRateLimiter", () => {
  it("counts across instances that share one store", async () => {
    const db = fakeRedis();
    const time = clock(1_000);
    const first = createSharedRateLimiter(db, "fetch", { max: 2, windowMs: 10_000 }, time.now);
    const second = createSharedRateLimiter(db, "fetch", { max: 2, windowMs: 10_000 }, time.now);
    expect(await first("a")).toEqual({ ok: true });
    expect(await second("a")).toEqual({ ok: true });
    time.advance(1_500);
    expect(await first("a")).toEqual({ ok: false, retryAfterSec: 8 });
  });

  it("opens a fresh window once the old one ends", async () => {
    const time = clock();
    const allow = createSharedRateLimiter(fakeRedis(), "fetch", { max: 1, windowMs: 1_000 }, time.now);
    await allow("a");
    expect((await allow("a")).ok).toBe(false);
    time.advance(1_000);
    expect((await allow("a")).ok).toBe(true);
  });
});

describe("clientAddress", () => {
  const req = (headers: Record<string, string>) => new Request("https://quire.fyi/api/meta", { headers });

  it("trusts the Cloudflare address only with the proxy secret", () => {
    const headers = { "cf-connecting-ip": "203.0.113.9", "x-real-ip": "198.51.100.7" };
    expect(clientAddress(req({ ...headers, [PROXY_HEADER]: "s3cret" }), "s3cret")).toBe("203.0.113.9");
    expect(clientAddress(req({ ...headers, [PROXY_HEADER]: "guess" }), "s3cret")).toBe("198.51.100.7");
    expect(clientAddress(req(headers), undefined)).toBe("198.51.100.7");
  });

  it("falls back to the first forwarded address", () => {
    expect(clientAddress(req({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" }))).toBe("198.51.100.1");
  });

  it("groups requests with no address together", () => {
    expect(clientAddress(req({}))).toBe("unknown");
  });
});
