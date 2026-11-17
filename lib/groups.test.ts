import { describe, expect, it } from "vitest";
import { groupItems, groupLabel, mix } from "./groups";
import type { GalleryItem } from "./useCatalog";

const item = (id: string, type: string, library = "lib"): GalleryItem => ({
  id,
  library,
  name: id,
  title: id,
  type,
  triggers: [],
  tech: [],
  docs: `https://example.com/${id}`,
});

describe("groupItems", () => {
  it("groups by family, biggest first, Other last", () => {
    const groups = groupItems([item("a", "button"), item("b", "other"), item("c", "button"), item("d", "card")]);
    expect(groups.map((g) => g.key)).toEqual(["Input", "Data", "Other"]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["a", "c"]);
  });

  it("splits a family of more than 15 into its types", () => {
    const many = Array.from({ length: 16 }, (_, n) => item(`b${n}`, n % 2 ? "button" : "input"));
    const keys = groupItems(many).map((g) => g.key);
    expect(keys.every((k) => k.startsWith("Input/"))).toBe(true);
    expect(keys).toHaveLength(2);
  });
});

describe("groupLabel", () => {
  it("labels families and types in the plural the sidebar uses", () => {
    expect(groupLabel("Effect")).toBe("Effects");
    expect(groupLabel("Effect/text-effect")).toBe("Text effects");
    expect(groupLabel("Other")).toBe("Other");
  });
});

describe("mix", () => {
  it("deals libraries in turn, items with a preview first", () => {
    const list = [
      { id: "a1", library: "a", preview: "x" },
      { id: "a2", library: "a", preview: "x" },
      { id: "b1", library: "b", preview: "x" },
      { id: "a3", library: "a" },
    ];
    expect(mix(list).map((i) => i.id)).toEqual(["a1", "b1", "a2", "a3"]);
  });
});
