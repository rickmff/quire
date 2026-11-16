import { describe, expect, it } from "vitest";
import { clientAddress, createRateLimiter } from "./rateLimit";

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

describe("clientAddress", () => {
  const req = (headers: Record<string, string>) => new Request("https://quire.fyi/api/meta", { headers });

  it("prefers the address Cloudflare reports", () => {
    expect(clientAddress(req({ "cf-connecting-ip": "203.0.113.9", "x-forwarded-for": "198.51.100.1" }))).toBe(
      "203.0.113.9",
    );
  });

  it("falls back to the first forwarded address", () => {
    expect(clientAddress(req({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" }))).toBe("198.51.100.1");
  });

  it("groups requests with no address together", () => {
    expect(clientAddress(req({}))).toBe("unknown");
  });
});
