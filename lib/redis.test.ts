import { afterEach, describe, expect, it, vi } from "vitest";
import { redisFromEnv } from "@/lib/redis";

const reply = (body: unknown, ok = true, status = 200) =>
  vi.fn(async () => ({ ok, status, json: async () => body }) as Response);

afterEach(() => vi.unstubAllGlobals());

describe("redisFromEnv", () => {
  it("is off without a URL and a token", () => {
    expect(redisFromEnv({} as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(redisFromEnv({ UPSTASH_REDIS_REST_URL: "https://r.example" } as unknown as NodeJS.ProcessEnv)).toBeNull();
  });

  it("runs one command with the token and returns its result", async () => {
    const fetch = reply({ result: "PONG" });
    vi.stubGlobal("fetch", fetch);
    const db = redisFromEnv({
      KV_REST_API_URL: "https://r.example/",
      KV_REST_API_TOKEN: "t",
    } as unknown as NodeJS.ProcessEnv)!;
    expect(await db.run(["PING"])).toBe("PONG");
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://r.example");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer t");
    expect(init.body).toBe('["PING"]');
  });

  it("runs a pipeline and throws on the first error in it", async () => {
    vi.stubGlobal("fetch", reply([{ result: 1 }, { result: 2 }]));
    const db = redisFromEnv({
      UPSTASH_REDIS_REST_URL: "https://r.example",
      UPSTASH_REDIS_REST_TOKEN: "t",
    } as unknown as NodeJS.ProcessEnv)!;
    expect(
      await db.pipeline([
        ["INCR", "a"],
        ["INCR", "b"],
      ]),
    ).toEqual([1, 2]);
    vi.stubGlobal("fetch", reply([{ result: 1 }, { error: "WRONGTYPE" }]));
    await expect(
      db.pipeline([
        ["INCR", "a"],
        ["INCR", "b"],
      ]),
    ).rejects.toThrow("WRONGTYPE");
  });

  it("throws when Redis answers with an error status", async () => {
    vi.stubGlobal("fetch", reply({}, false, 503));
    const db = redisFromEnv({
      UPSTASH_REDIS_REST_URL: "https://r.example",
      UPSTASH_REDIS_REST_TOKEN: "t",
    } as unknown as NodeJS.ProcessEnv)!;
    await expect(db.run(["PING"])).rejects.toThrow("Redis 503");
  });
});
