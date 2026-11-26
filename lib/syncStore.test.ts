import { afterEach, describe, expect, it, vi } from "vitest";

const db = new Map<string, string>();
vi.mock("@/lib/kv", () => ({
  kv: () => ({
    name: "test",
    get: async (k: string) => db.get(k) ?? null,
    put: async (k: string, v: string) => void db.set(k, v),
  }),
}));

const { loadLibrary, saveLibrary } = await import("@/lib/sync");
const key = "a".repeat(24);

afterEach(() => db.clear());

describe("saving and loading a synced library", () => {
  it("loads what it saved, under a valid key only", async () => {
    await saveLibrary(key, { items: [], sources: ["magicui"] } as never);
    expect(await loadLibrary(key)).toEqual({ items: [], sources: ["magicui"] });
    expect(await loadLibrary("short")).toBeNull();
    expect(await loadLibrary(null)).toBeNull();
  });

  it("reads a broken record as missing and refuses a library over 1.5 MB", async () => {
    db.set(`lib:${key}`, "{broken");
    expect(await loadLibrary(key)).toBeNull();
    await expect(saveLibrary(key, { items: [{ note: "x".repeat(1_600_000) }] } as never)).rejects.toThrow("too-large");
  });
});
