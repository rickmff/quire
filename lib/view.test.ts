import { describe, expect, it } from "vitest";
import { groupView, isGallery, pathView, siteKey, siteView, typeView, viewPath } from "./view";

describe("viewPath and pathView", () => {
  it.each([
    ["starred", "/app"],
    ["libraries", "/app/all-libraries"],
    ["site:magicui", "/app/all-libraries/magicui"],
    ["sites", "/app/sites"],
    ["agents", "/app/agents"],
    ["type:button", "/app/types/button"],
    ["col123", "/app/collections/col123"],
  ])("maps %s to %s and back", (view, path) => {
    expect(viewPath(view)).toBe(path);
    expect(pathView(path)).toBe(view);
  });

  it("sends the old Saved views to Starred", () => {
    expect(viewPath("all")).toBe("/app");
    expect(viewPath("library")).toBe("/app");
    expect(viewPath(null)).toBe("/app");
  });

  it("names a family group by its slug and a split type group by the type", () => {
    expect(viewPath("site:magicui|Effect")).toBe("/app/all-libraries/magicui/effect");
    expect(viewPath("site:magicui|Effect/text-effect")).toBe("/app/all-libraries/magicui/text-effect");
    expect(pathView("/app/all-libraries/magicui/effect")).toBe("site:magicui|Effect");
    expect(pathView("/app/all-libraries/magicui/text-effect")).toBe("site:magicui|Effect/text-effect");
  });

  it("encodes ids that need it", () => {
    expect(viewPath("my list")).toBe("/app/collections/my%20list");
    expect(pathView("/app/collections/my%20list")).toBe("my list");
  });

  it("falls back to Starred for unknown paths", () => {
    expect(pathView("/app/nowhere")).toBe("starred");
    expect(pathView("/app/types")).toBe("starred");
  });
});

describe("view parts", () => {
  it("reads the type, site and group of a view", () => {
    expect(typeView("type:card")).toBe("card");
    expect(typeView("starred")).toBeNull();
    expect(siteView("site:magicui|Effect")).toBe("magicui");
    expect(groupView("site:magicui|Effect")).toBe("Effect");
    expect(groupView("site:magicui")).toBeNull();
  });

  it("knows which views are galleries", () => {
    expect(isGallery("starred")).toBe(true);
    expect(isGallery("libraries")).toBe(true);
    expect(isGallery("type:card")).toBe(true);
    expect(isGallery("site:magicui")).toBe(true);
    expect(isGallery("sites")).toBe(false);
    expect(isGallery("col123")).toBe(false);
  });

  it("groups links the user added by the site they came from", () => {
    expect(siteKey({ library: "magicui" })).toBe("magicui");
    expect(siteKey({ library: "mine", site: "Rare UI" })).toBe("mine-rare-ui");
    expect(siteKey({ library: "mine" })).toBe("mine-mine");
  });
});
