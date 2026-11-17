import { describe, expect, it } from "vitest";
import {
  type Bookmark,
  type Library,
  exportJSON,
  exportMarkdown,
  normalizeUrl,
  selectView,
  toComponent,
  toSynced,
} from "./store";

const bookmark = (over: Partial<Bookmark>): Bookmark => ({
  id: "b1",
  url: "https://example.com/components/glow-button",
  title: "Glow Button",
  library: "example.com",
  tags: [],
  collectionId: null,
  createdAt: 1,
  ...over,
});

const library = (bookmarks: Bookmark[]): Library => ({
  version: 1,
  bookmarks,
  collections: [{ id: "c1", name: "Hero ideas", createdAt: 1 }],
});

describe("normalizeUrl", () => {
  it.each([
    ["magicui.design/docs/components/marquee", "https://magicui.design/docs/components/marquee"],
    ["  https://example.com/a#section  ", "https://example.com/a"],
    ["HTTP://Example.com", "http://example.com/"],
  ])("turns %s into %s", (input, out) => {
    expect(normalizeUrl(input)).toBe(out);
  });

  it.each(["", "hello world", "localhost", "not a link"])("rejects %j", (input) => {
    expect(normalizeUrl(input)).toBeNull();
  });
});

describe("selectView", () => {
  const lib = library([bookmark({ id: "a", collectionId: "c1", type: "button" }), bookmark({ id: "b", type: "card" })]);

  it("lists every bookmark for all, the loose ones for the inbox", () => {
    expect(selectView(lib, "all").items.map((b) => b.id)).toEqual(["a", "b"]);
    expect(selectView(lib, null).items.map((b) => b.id)).toEqual(["b"]);
  });

  it("filters by type and by collection", () => {
    expect(selectView(lib, "type:card").items.map((b) => b.id)).toEqual(["b"]);
    expect(selectView(lib, "c1")).toMatchObject({ name: "Hero ideas", items: [{ id: "a" }] });
  });
});

describe("exports for agents", () => {
  const lib = library([bookmark({ install: "npx shadcn add glow", note: "use on pricing", type: "button" })]);

  it("writes a Markdown brief with the install command and note", () => {
    const md = exportMarkdown(lib, "all");
    expect(md).toContain("## Glow Button");
    expect(md).toContain("- Install: `npx shadcn add glow`");
    expect(md).toContain("- Note: use on pricing");
  });

  it("writes JSON without empty fields", () => {
    const json = JSON.parse(exportJSON(lib, "all"));
    expect(json.components[0]).toEqual({
      title: "Glow Button",
      type: "Button",
      url: "https://example.com/components/glow-button",
      library: "example.com",
      install: "npx shadcn add glow",
      note: "use on pricing",
    });
  });
});

describe("toComponent and toSynced", () => {
  it("keeps the catalog id of a starred curated component", () => {
    const c = toComponent(bookmark({ ref: "magicui/marquee" }));
    expect(c).toMatchObject({ id: "magicui/marquee", library: "magicui", site: "example.com" });
  });

  it("gives a pasted link a mine/ id and only an https registry", () => {
    const c = toComponent(bookmark({ registry: "owner/repo/item" }));
    expect(c.id).toBe("mine/b1");
    expect(c.item).toBeUndefined();
  });

  it("syncs the curated mode by default", () => {
    expect(toSynced(library([bookmark({})]))).toMatchObject({
      mode: "curated",
      sources: [],
      items: [{ id: "mine/b1" }],
    });
  });
});
