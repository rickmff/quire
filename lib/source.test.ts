import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogComponent } from "@/lib/catalog/schema";

const fetchText = vi.fn();
vi.mock("@/lib/net", () => ({ fetchText: (...a: unknown[]) => fetchText(...a) }));

const { readSource } = await import("@/lib/source");

const component = (over: Partial<CatalogComponent>) =>
  ({
    id: `x/${Math.random()}`,
    title: "X",
    library: "x",
    type: "other",
    triggers: [],
    tech: [],
    docs: "",
    ...over,
  }) as CatalogComponent;

beforeEach(() => fetchText.mockReset());

describe("readSource", () => {
  it("reads the files of a registry item with their dependencies", async () => {
    fetchText.mockResolvedValueOnce({
      text: JSON.stringify({
        files: [{ path: "a.tsx", target: "components/a.tsx", content: "export {}" }, { path: "b.tsx" }],
        dependencies: ["motion"],
      }),
    });
    const out = await readSource(component({ item: "https://r.dev/a.json" }));
    expect(out?.from).toBe("https://r.dev/a.json");
    expect(out?.files).toEqual([{ path: "components/a.tsx", content: "export {}" }]);
    expect(out?.dependencies).toEqual(["motion"]);
  });

  it("falls back to GitHub when the registry has no file content", async () => {
    fetchText.mockResolvedValueOnce({ text: "{}" }).mockResolvedValueOnce({ text: "const a = 1" });
    const out = await readSource(component({ item: "https://r.dev/b.json", repo: "o/r", files: ["src/a b.tsx"] }));
    expect(out?.from).toBe("https://github.com/o/r");
    expect(fetchText.mock.calls[1][0]).toBe("https://raw.githubusercontent.com/o/r/HEAD/src/a%20b.tsx");
  });

  it("clips large files and marks them truncated", async () => {
    fetchText.mockResolvedValue({ text: "x".repeat(50_000) });
    const out = await readSource(component({ repo: "o/r", files: ["a", "b", "c", "d"] }));
    expect(out?.files[0]).toMatchObject({ truncated: true });
    expect(out?.files.reduce((n, f) => n + f.content.length, 0)).toBeLessThanOrEqual(120_000);
  });

  it("keeps the answer for an hour, even when there is none", async () => {
    fetchText.mockResolvedValue(null);
    const c = component({ item: "https://r.dev/c.json" });
    expect(await readSource(c)).toBeNull();
    expect(await readSource(c)).toBeNull();
    expect(fetchText).toHaveBeenCalledTimes(1);
  });
});
