import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
});

const req = (ip: string) => new Request("https://quire.fyi/api/meta", { headers: { "x-real-ip": ip } });

describe("rateLimited", () => {
  it("answers 429 with Retry-After once a client passes the limit, in memory without Redis", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("KV_REST_API_URL", "");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    const { rateLimited, ROUTE_LIMITS } = await import("@/lib/rateLimit");
    for (let i = 0; i < ROUTE_LIMITS.capture.max; i++) expect(await rateLimited(req("1.1.1.1"), "capture")).toBeNull();
    const refused = await rateLimited(req("1.1.1.1"), "capture", { "access-control-allow-origin": "*" });
    expect(refused?.status).toBe(429);
    expect(Number(refused?.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(refused?.headers.get("access-control-allow-origin")).toBe("*");
    expect(await rateLimited(req("2.2.2.2"), "capture")).toBeNull();
  });

  it("falls back to memory when Redis fails", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://r.dev");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "t");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new Error("down"))),
    );
    const { rateLimited } = await import("@/lib/rateLimit");
    expect(await rateLimited(req("3.3.3.3"), "read")).toBeNull();
  });
});
