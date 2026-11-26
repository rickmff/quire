import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("useCatalog", () => {
  it("fetches the versioned catalog once for every component that asks", async () => {
    const fetch = vi.fn(async () => ({ json: async () => ({ generatedAt: "x", libraries: [], components: [] }) }));
    vi.stubGlobal("fetch", fetch);
    const { useCatalog, preloadCatalog } = await import("@/lib/useCatalog");
    preloadCatalog();
    const a = renderHook(() => useCatalog());
    const b = renderHook(() => useCatalog());
    await waitFor(() => expect(a.result.current?.generatedAt).toBe("x"));
    await waitFor(() => expect(b.result.current?.generatedAt).toBe("x"));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String((fetch.mock.calls[0] as unknown[])[0])).toMatch(/^\/api\/catalog\?v=/);
  });

  it("reads whether sync and capture are on, and treats a failed status as off", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new Error("offline"))),
    );
    const { useSyncAvailable, useCaptureAvailable } = await import("@/lib/useCatalog");
    const sync = renderHook(() => useSyncAvailable());
    const capture = renderHook(() => useCaptureAvailable());
    await waitFor(() => expect(sync.result.current).toBe(false));
    await waitFor(() => expect(capture.result.current).toBe(false));
  });
});
