import { describe, expect, it } from "vitest";
import { type KV, withFallback } from "./kv";

function memory(name: string, seed: Record<string, string> = {}): KV & { data: Map<string, string> } {
  const data = new Map(Object.entries(seed));
  return {
    name,
    data,
    get: async (key) => data.get(key) ?? null,
    put: async (key, value) => void data.set(key, value),
  };
}

describe("withFallback", () => {
  it("copies a value from the old store into the new one the first time it is read", async () => {
    const primary = memory("new");
    const legacy = memory("old", { lib: "saved" });
    const db = withFallback(primary, legacy);
    expect(await db.get("lib")).toBe("saved");
    expect(primary.data.get("lib")).toBe("saved");
  });

  it("writes only to the new store", async () => {
    const primary = memory("new");
    const legacy = memory("old");
    await withFallback(primary, legacy).put("lib", "v2");
    expect(primary.data.get("lib")).toBe("v2");
    expect(legacy.data.has("lib")).toBe(false);
  });

  it("reads as missing when the old store fails", async () => {
    const legacy: KV = { name: "old", get: () => Promise.reject(new Error("down")), put: async () => {} };
    expect(await withFallback(memory("new"), legacy).get("lib")).toBeNull();
  });
});
