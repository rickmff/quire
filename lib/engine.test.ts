import { describe, expect, it } from "vitest";
import { engineById, engineOf, rebuildPrompt, uiSdkParts } from "./engine";

describe("engineOf", () => {
  it("reads the engine from the component name", () => {
    expect(engineOf({ name: "components-radix-dialog" })).toBe("radix");
    expect(engineOf({ name: "primitives-base-menu" })).toBe("base-ui");
    expect(engineOf({ name: "primitives-headless-disclosure" })).toBe("headless-ui");
  });

  it("reads the engine from the dependencies", () => {
    expect(engineOf({ name: "x", dependencies: ["motion", "@radix-ui/react-dialog"] })).toBe("radix");
    expect(engineOf({ name: "x", dependencies: ["radix-ui"] })).toBe("radix");
    expect(engineOf({ name: "x", dependencies: ["@base-ui-components/react"] })).toBe("base-ui");
    expect(engineOf({ name: "x", dependencies: ["react-aria-components"] })).toBe("react-aria");
    expect(engineOf({ name: "x", dependencies: ["@ui-sdk/react"] })).toBe("ui-sdk");
  });

  it("ignores icon packages and plain components", () => {
    expect(engineOf({ name: "bento-grid", dependencies: ["@radix-ui/react-icons"] })).toBeUndefined();
    expect(engineOf({ name: "database-icon", dependencies: ["motion"] })).toBeUndefined();
  });
});

describe("engineById", () => {
  it("takes an id or a name", () => {
    expect(engineById("base-ui")).toBe("base-ui");
    expect(engineById("Base UI")).toBe("base-ui");
    expect(engineById("nope")).toBeUndefined();
  });
});

describe("uiSdkParts", () => {
  it("prefers the part the name says over the type", () => {
    expect(uiSdkParts({ type: "notification", name: "components-radix-alert-dialog" })).toEqual(["alert-dialog"]);
    expect(uiSdkParts({ type: "popover", name: "components-radix-dropdown-menu" })).toEqual(["menu"]);
    expect(uiSdkParts({ type: "drawer", name: "components-radix-sheet" })).toEqual(["drawer"]);
    expect(uiSdkParts({ type: "toggle", name: "components-radix-radio-group" })).toEqual(["radio"]);
  });

  it("falls back to the parts for the type", () => {
    expect(uiSdkParts({ type: "modal", name: "hero-video" })).toEqual(["dialog", "alert-dialog"]);
  });
});

describe("rebuildPrompt", () => {
  const item = { id: "animate-ui/components-radix-dialog", title: "Dialog", type: "modal", docs: "https://x" };

  it("names the UI SDK parts and the engine it replaces", () => {
    const text = rebuildPrompt({ ...item, engine: "radix" }, "Animate UI")!;
    expect(text).toContain("@ui-sdk/react/dialog");
    expect(text).toContain("instead of Radix");
    expect(text).toContain("Quire id: animate-ui/components-radix-dialog");
  });

  it("is empty when UI SDK has no matching part or already powers it", () => {
    expect(uiSdkParts({ type: "background" })).toEqual([]);
    expect(rebuildPrompt({ ...item, type: "background" }, "x")).toBeNull();
    expect(rebuildPrompt({ ...item, engine: "ui-sdk" }, "x")).toBeNull();
  });
});
