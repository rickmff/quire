import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
});

const load = async (env: Record<string, string>) => {
  for (const k of ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL", "KV_REST_API_TOKEN"])
    vi.stubEnv(k, "");
  for (const k of ["CF_ACCOUNT_ID", "CF_KV_NAMESPACE_ID", "CF_API_TOKEN", "QUIRE_FILE_STORE"]) vi.stubEnv(k, "");
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return (await import("@/lib/kv")).kv();
};

describe("kv", () => {
  it("keeps libraries in files during development", async () => {
    const dir = await mkdtemp(join(tmpdir(), "quire-kv-"));
    vi.spyOn(process, "cwd").mockReturnValue(dir);
    const store = (await load({ NODE_ENV: "development" }))!;
    expect(store.name).toBe("files");
    expect(await store.get("lib:a/b")).toBeNull();
    await store.put("lib:a/b", "{}");
    expect(await store.get("lib:a/b")).toBe("{}");
    await rm(dir, { recursive: true });
  });

  it("has no store in production without Redis, Cloudflare or the file flag", async () => {
    expect(await load({ NODE_ENV: "production" })).toBeNull();
  });

  it("uses Upstash when it is configured", async () => {
    const fetch = vi.fn(async () => ({ ok: true, json: async () => ({ result: "v" }) }));
    vi.stubGlobal("fetch", fetch);
    const store = (await load({
      NODE_ENV: "production",
      UPSTASH_REDIS_REST_URL: "https://r.dev",
      UPSTASH_REDIS_REST_TOKEN: "t",
    }))!;
    expect(store.name).toBe("upstash");
    expect(await store.get("k")).toBe("v");
    await store.put("k", "w");
    expect(JSON.parse(String((fetch.mock.calls[1] as unknown as [string, RequestInit])[1].body))).toEqual([
      "SET",
      "k",
      "w",
    ]);
  });

  it("reads Cloudflare KV, with a 404 as a missing key", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => "old" })
      .mockResolvedValueOnce({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetch);
    const store = (await load({
      NODE_ENV: "production",
      CF_ACCOUNT_ID: "a",
      CF_KV_NAMESPACE_ID: "n",
      CF_API_TOKEN: "t",
    }))!;
    expect(store.name).toBe("cloudflare-kv");
    expect(await store.get("k")).toBeNull();
    expect(await store.get("k")).toBe("old");
    await expect(store.get("k")).rejects.toThrow("KV get 500");
  });
});
