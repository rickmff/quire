import { describe, expect, it } from "vitest";
import { matchLibrary, titleFromUrl } from "./libraries";
import { mergeLibrary } from "./libraryFile";
import { techFrom, triggersFor } from "./motion";
import type { Library } from "./store";
import { classify, typeById } from "./types";

describe("classify", () => {
  it("prefers the title over the description", () => {
    expect(classify({ title: "Shiny Button", description: "a card with a glow" })).toBe("button");
  });

  it("splits camel case and dashes before matching", () => {
    expect(classify({ name: "animated-tooltip" })).toBe(classify({ title: "Animated Tooltip" }));
  });

  it("falls back to Other", () => {
    expect(classify({ title: "Zorblax" })).toBe("other");
    expect(typeById("missing").id).toBe("other");
  });
});

describe("motion", () => {
  it("finds triggers and tech", () => {
    expect(triggersFor({ title: "Magnetic Button" })).toContain("hover");
    expect(techFrom(["motion", "three", "clsx"])).toEqual(expect.arrayContaining(["Motion", "Three.js"]));
  });
});

describe("matchLibrary and titleFromUrl", () => {
  it("knows the install command of a shadcn style library", () => {
    expect(matchLibrary("https://magicui.design/docs/components/marquee")).toEqual({
      library: "Magic UI",
      install: "npx shadcn@latest add @magicui/marquee",
    });
  });

  it("falls back to the host for unknown sites", () => {
    expect(matchLibrary("https://www.rareui.com/components/otp")).toEqual({ library: "rareui.com" });
  });

  it("titles a link from its last path segment", () => {
    expect(titleFromUrl("https://example.com/components/glow-button")).toMatch(/glow button/i);
  });
});

describe("mergeLibrary", () => {
  const mine: Library = {
    version: 1,
    mode: "curated",
    sources: ["magicui"],
    collections: [{ id: "c1", name: "Mine", createdAt: 1 }],
    bookmarks: [
      { id: "a", url: "https://x.dev/a", title: "A", library: "x", tags: [], collectionId: null, createdAt: 1 },
    ],
  };
  const backup: Library = {
    version: 1,
    collections: [
      { id: "c1", name: "Mine", createdAt: 1 },
      { id: "c2", name: "From backup", createdAt: 2 },
    ],
    bookmarks: [
      { id: "a2", url: "https://x.dev/a", title: "A again", library: "x", tags: [], collectionId: null, createdAt: 2 },
      { id: "b", url: "https://x.dev/b", title: "B", library: "x", tags: [], collectionId: "c2", createdAt: 2 },
    ],
  };

  it("adds what the library lacks and skips links it already has", () => {
    const merged = mergeLibrary(mine, backup);
    expect(merged.bookmarks.map((b) => b.id)).toEqual(["b", "a"]);
    expect(merged.collections.map((c) => c.id)).toEqual(["c1", "c2"]);
  });

  it("keeps the libraries the user follows", () => {
    expect(mergeLibrary(mine, backup)).toMatchObject({ mode: "curated", sources: ["magicui"] });
  });

  it("ignores a file that is not a library", () => {
    expect(mergeLibrary(mine, { nope: true } as unknown as Library)).toBe(mine);
  });
});
