import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  newSyncKey,
  pushLibrary,
  readLibrary,
  updateLibrary,
  useLibrary,
  writeLibrary,
  type Library,
} from "@/lib/store";

const lib = (over: Partial<Library> = {}): Library => ({ version: 1, bookmarks: [], collections: [], ...over });

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("the library in localStorage", () => {
  it("reads an empty library when nothing or something broken is stored", () => {
    expect(readLibrary().bookmarks).toEqual([]);
    localStorage.setItem("quire:v1", "{not json");
    expect(readLibrary().bookmarks).toEqual([]);
    localStorage.setItem("quire:v1", JSON.stringify({ bookmarks: "no" }));
    expect(readLibrary().collections).toEqual([]);
  });

  it("writes, reads back and updates only on a real change", () => {
    writeLibrary(lib({ mode: "curated" }));
    expect(readLibrary().mode).toBe("curated");
    const before = localStorage.getItem("quire:v1");
    updateLibrary((l) => l);
    expect(localStorage.getItem("quire:v1")).toBe(before);
    updateLibrary((l) => ({ ...l, sources: ["magicui"] }));
    expect(readLibrary().sources).toEqual(["magicui"]);
  });

  it("follows a change made in another tab", () => {
    const { result } = renderHook(() => useLibrary());
    localStorage.setItem("quire:v1", JSON.stringify(lib({ sources: ["prestige"] })));
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "quire:v1" }));
    });
    expect(result.current.lib.sources).toEqual(["prestige"]);
  });
});

describe("sync", () => {
  it("makes long random keys", () => {
    const a = newSyncKey();
    expect(a.length).toBeGreaterThanOrEqual(24);
    expect(newSyncKey()).not.toBe(a);
  });

  it("does not push a library without a key", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await pushLibrary(lib())).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("pushes a library with a key and pushes again after a change", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(async () => ({ ok: true }) as Response);
    vi.stubGlobal("fetch", fetch);
    writeLibrary(lib({ syncKey: "k".repeat(24) }));
    const { result } = renderHook(() => useLibrary());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1300);
    });
    expect(fetch).toHaveBeenCalled();
    expect(String(fetch.mock.calls[0][0])).toContain(`/api/library/${"k".repeat(24)}`);
    act(() => result.current.update((l) => ({ ...l, sources: ["magicui"] })));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1300);
    });
    expect(fetch.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
