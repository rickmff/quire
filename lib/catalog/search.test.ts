import { describe, expect, it } from "vitest";
import { catalog, facets, readBrief, scope, search } from "./index";

describe("search", () => {
  it("ranks a title match first", () => {
    const { items } = search(catalog.components, { query: "globe" });
    expect(items[0].title.toLowerCase()).toContain("globe");
  });

  it("expands synonyms", () => {
    const viaSynonym = search(catalog.components, { query: "modal" }).total;
    const direct = search(catalog.components, { query: "dialog" }).total;
    expect(viaSynonym).toBe(direct);
  });

  it("filters by type and library and caps the limit at 50", () => {
    const { items } = search(catalog.components, { type: "button", library: "Magic UI", limit: 500 });
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(50);
    expect(items.every((c) => c.type === "button" && c.library === "magicui")).toBe(true);
  });

  it("returns nothing for words no component has", () => {
    expect(search(catalog.components, { query: "zzqqxx" }).total).toBe(0);
  });
});

describe("readBrief", () => {
  it("reads component types and motion from a plain brief", () => {
    const read = readBrief("pricing page with a playful toggle and a magnetic button");
    expect(read.types).toContain("button");
    expect(read.triggers).toContain("hover");
  });
});

describe("scope", () => {
  it("serves the curated catalog without a user", () => {
    expect(scope(null)).toBe(catalog.components);
  });

  it("puts a user's own items first, then the libraries they follow", () => {
    const own = { ...catalog.components[0], id: "mine/1" };
    const items = scope({ version: 1, mode: "curated", sources: ["magicui"], items: [own], updatedAt: 0 });
    expect(items[0].id).toBe("mine/1");
    expect(items.slice(1).every((c) => c.library === "magicui")).toBe(true);
  });
});

describe("facets", () => {
  it("counts every component once per type", () => {
    const f = facets(catalog.components);
    expect(f.types.reduce((n, t) => n + t.count, 0)).toBe(catalog.components.length);
  });
});
