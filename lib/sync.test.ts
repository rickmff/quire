import { describe, expect, it } from "vitest";
import { cleanLibrary, KEY_RE } from "./sync";

describe("cleanLibrary", () => {
  it("rejects anything that is not an object", () => {
    expect(cleanLibrary(null)).toBeNull();
    expect(cleanLibrary("library")).toBeNull();
  });

  it("keeps valid items, trims fields and drops the rest", () => {
    const lib = cleanLibrary({
      mode: "scratch",
      sources: ["magicui", "not-a-library", 7],
      items: [
        { id: " mine/1 ", title: "Glow", docs: "https://example.com/glow", triggers: ["hover", 3] },
        { id: "mine/2", title: "No docs" },
        { id: "mine/3", title: "Bad docs", docs: "javascript:alert(1)" },
        "not an item",
      ],
    });
    expect(lib?.mode).toBe("scratch");
    expect(lib?.sources).toEqual(["magicui"]);
    expect(lib?.items).toHaveLength(1);
    expect(lib?.items[0]).toMatchObject({
      id: "mine/1",
      title: "Glow",
      library: "mine",
      type: "other",
      triggers: ["hover"],
    });
  });

  it("caps long text", () => {
    const lib = cleanLibrary({ items: [{ id: "x", title: "t".repeat(500), docs: "https://example.com" }] });
    expect(lib?.items[0].title).toHaveLength(160);
  });
});

describe("KEY_RE", () => {
  it("accepts only lowercase keys of 24 to 48 characters", () => {
    expect(KEY_RE.test("a".repeat(24))).toBe(true);
    expect(KEY_RE.test("a".repeat(23))).toBe(false);
    expect(KEY_RE.test("A".repeat(30))).toBe(false);
    expect(KEY_RE.test("a".repeat(49))).toBe(false);
  });
});
