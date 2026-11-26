import { describe, expect, it } from "vitest";
import { mergeLibrary } from "@/lib/libraryFile";
import type { Bookmark, Library } from "@/lib/store";

const mark = (id: string, url: string, collectionId: string | null = null): Bookmark => ({
  id,
  url,
  title: id,
  library: "mine",
  tags: [],
  collectionId,
  createdAt: 0,
});

describe("mergeLibrary", () => {
  const mine: Library = {
    version: 1,
    bookmarks: [mark("a", "https://a.dev")],
    collections: [{ id: "c1", name: "Mine", createdAt: 0 }],
    sources: ["magicui"],
    syncKey: "k",
  };

  it("adds new bookmarks first and skips links already there", () => {
    const file: Library = {
      version: 1,
      bookmarks: [mark("b", "https://b.dev"), mark("a2", "https://a.dev")],
      collections: [],
    };
    const out = mergeLibrary(mine, file);
    expect(out.bookmarks.map((b) => b.id)).toEqual(["b", "a"]);
  });

  it("adds new collections and keeps the followed libraries and the sync key", () => {
    const file: Library = {
      version: 1,
      bookmarks: [],
      collections: [
        { id: "c1", name: "Theirs", createdAt: 1 },
        { id: "c2", name: "New", createdAt: 1 },
      ],
    };
    const out = mergeLibrary(mine, file);
    expect(out.collections.map((c) => c.name)).toEqual(["Mine", "New"]);
    expect(out.sources).toEqual(["magicui"]);
    expect(out.syncKey).toBe("k");
  });

  it("ignores a file that is not a library", () => {
    expect(mergeLibrary(mine, {} as Library)).toBe(mine);
  });
});
