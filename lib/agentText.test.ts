import { describe, expect, it } from "vitest";
import { agentText } from "@/lib/agentText";

describe("agentText", () => {
  const item = {
    id: "magicui/marquee",
    title: "Marquee",
    type: "carousel",
    description: "Scrolls content in a loop.",
    docs: "https://magicui.design/docs/components/marquee",
    install: "npx shadcn@latest add @magicui/marquee",
  };

  it("names the component, its site, its reference, its install and its Quire id", () => {
    const text = agentText(item, "Magic UI").split("\n");
    expect(text[0]).toMatch(/^Marquee \(Magic UI\), /);
    expect(text).toContain("Scrolls content in a loop.");
    expect(text).toContain(`Reference: ${item.docs}`);
    expect(text).toContain(`Install: ${item.install}`);
    expect(text.at(-1)).toContain("Quire id: magicui/marquee");
  });

  it("leaves out what a saved link does not have", () => {
    const text = agentText({ id: "mine/x", title: "X", type: "other", docs: "https://x.dev" }, "x.dev");
    expect(text).not.toContain("Install:");
    expect(text).not.toContain("Quire id");
    expect(text.split("\n")).toHaveLength(2);
  });
});
