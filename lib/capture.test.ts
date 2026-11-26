import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

const load = async (env: Record<string, string>) => {
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import("@/lib/capture");
};

describe("capture", () => {
  it("is off while adding by link is off, even with a capture service", async () => {
    const { capture, captureEnabled } = await load({ QUIRE_CAPTURE_URL: "https://c.dev", QUIRE_CAPTURE_TOKEN: "t" });
    expect(captureEnabled()).toBe(false);
    expect(await capture("https://x.dev")).toBeNull();
  });

  it("posts the link with the token when it is on", async () => {
    const fetch = vi.fn(async () => ({ ok: true, json: async () => ({ image: "i.webp" }) }));
    vi.stubGlobal("fetch", fetch);
    const { capture } = await load({
      NEXT_PUBLIC_QUIRE_USER_ADDS: "1",
      QUIRE_CAPTURE_URL: "https://c.dev/",
      QUIRE_CAPTURE_TOKEN: "t",
    });
    expect(await capture("https://x.dev", false)).toEqual({ image: "i.webp" });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://c.dev/capture");
    expect(JSON.parse(init.body as string)).toEqual({ url: "https://x.dev", video: false });
  });

  it("answers null when the service fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new Error("down"))),
    );
    const { capture } = await load({
      NEXT_PUBLIC_QUIRE_USER_ADDS: "1",
      QUIRE_CAPTURE_URL: "https://c.dev",
      QUIRE_CAPTURE_TOKEN: "t",
    });
    expect(await capture("https://x.dev")).toBeNull();
  });
});
