import { describe, expect, it } from "vitest";
import { catalog } from "@/lib/catalog";
import { appDescription, galleryPages, pageAt } from "@/lib/pages";
import { pathView, viewPath } from "@/lib/view";

describe("gallery pages", () => {
  const pages = galleryPages();

  it("has one page per library, with every component of it", () => {
    for (const lib of catalog.libraries) {
      const page = pageAt(`/app/all-libraries/${lib.id}`);
      expect(page?.title).toBe(`${lib.name} components`);
      expect(page?.items.length).toBe(catalog.components.filter((c) => c.library === lib.id).length);
    }
  });

  it("gives every page a path the app opens as the same view", () => {
    for (const p of pages) expect(viewPath(pathView(p.path))).toBe(p.path);
  });

  it("has no two pages on one path and no empty page", () => {
    expect(new Set(pages.map((p) => p.path)).size).toBe(pages.length);
    for (const p of pages) expect(p.items.length).toBeGreaterThan(0);
  });

  it("keeps descriptions short enough for a search result", () => {
    for (const p of pages) expect(p.description.length).toBeLessThanOrEqual(200);
  });

  it("names every library in the gallery description", () => {
    for (const lib of catalog.libraries) expect(appDescription()).toContain(lib.name);
  });

  it("finds nothing for a collection", () => {
    expect(pageAt("/app/collections/abc")).toBeNull();
  });
});
