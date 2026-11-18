import { describe, expect, it } from "vitest";
import { demoStyle, docsTemplate, findInDirectory, firstSentence, pickRegistry, repoFromHtml } from "./discover";

describe("findInDirectory", () => {
  const dir = [
    { name: "@eldoraui", homepage: "https://eldoraui.site", url: "https://eldoraui.site/r/{name}.json" },
    { name: "@magicui", homepage: "https://magicui.design" },
  ];

  it("matches the homepage host, with or without www and a path", () => {
    expect(findInDirectory(dir, "https://www.eldoraui.site/docs")?.name).toBe("@eldoraui");
  });

  it("matches a scope", () => {
    expect(findInDirectory(dir, "@magicui")?.name).toBe("@magicui");
  });

  it("returns nothing for an unknown site", () => {
    expect(findInDirectory(dir, "https://example.com")).toBeUndefined();
  });
});

describe("repoFromHtml", () => {
  it("picks the repository the page links to most", () => {
    const html = `<a href="https://github.com/shadcn-ui/ui">x</a>
      <a href="https://github.com/acme/kit">a</a><a href="https://github.com/acme/kit/stargazers">b</a>
      <a href="https://github.com/other/thing">c</a>`;
    expect(repoFromHtml(html)).toBe("acme/kit");
  });
});

describe("pickRegistry", () => {
  const files = [
    "registry.json",
    "apps/www/public/r/registry.json",
    "apps/www/public/r/marquee.json",
    "apps/www/public/r/marquee-demo.json",
    "apps/www/public/r/grid.json",
  ];
  const registries: Record<string, string> = {
    "registry.json": JSON.stringify({ items: [{ name: "marquee", type: "registry:ui" }] }),
    "apps/www/public/r/registry.json": JSON.stringify({
      items: [
        { name: "marquee", type: "registry:ui" },
        { name: "grid", type: "registry:ui" },
        { name: "marquee-demo", type: "registry:example" },
      ],
    }),
  };

  it("prefers the built registry under public/r and finds its source root", () => {
    const r = pickRegistry(files, (p) => registries[p]);
    expect(r).toMatchObject({ path: "apps/www/public/r/registry.json", dir: "apps/www/public/r", root: "apps/www" });
    expect(r?.count).toBe(2);
    expect(r?.built).toBe(true);
  });

  it("returns nothing without a registry that lists components", () => {
    expect(pickRegistry(["README.md"], () => "")).toBeUndefined();
  });
});

describe("demoStyle", () => {
  it("tells suffix demos from prefix demos", () => {
    expect(demoStyle([{ name: "a" }, { name: "a-demo" }, { name: "a-demo-2" }])).toBe("suffix");
    expect(demoStyle([{ name: "a" }, { name: "demo-a" }])).toBe("prefix");
  });
});

describe("docsTemplate", () => {
  it("builds the docs URL from the docs page in the repository", () => {
    const files = ["apps/www/content/docs/components/marquee.mdx"];
    expect(docsTemplate(files, "https://eldoraui.site/", ["marquee"])).toEqual({
      template: "https://eldoraui.site/docs/components/{name}",
      guessed: false,
    });
  });

  it("guesses when no docs page is found", () => {
    expect(docsTemplate([], "https://x.dev", ["a"]).guessed).toBe(true);
  });
});

it("firstSentence keeps the first sentence", () => {
  expect(firstSentence("A kit. With more.")).toBe("A kit.");
});
