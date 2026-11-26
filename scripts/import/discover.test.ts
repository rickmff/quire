import { describe, expect, it } from "vitest";
import {
  demoStyle,
  docsLayout,
  findInDirectory,
  firstSentence,
  hostedRegistry,
  libraryName,
  pickRegistry,
  repoFromHtml,
} from "./discover";

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

describe("docsLayout", () => {
  it("builds the docs URL from the docs page in the repository", () => {
    const files = ["apps/www/content/docs/components/marquee.mdx"];
    expect(docsLayout(files, "https://eldoraui.site/", ["marquee"])).toEqual({
      template: "https://eldoraui.site/docs/components/{name}",
      guessed: false,
    });
  });

  it("maps each page when docs sit in category folders", () => {
    const files = [
      "apps/docs/content/docs/ai/ai-prompt.mdx",
      "apps/docs/content/docs/navigation/action-search-bar.mdx",
      "apps/docs/content/docs/navigation/toolbar.mdx",
      "apps/docs/content/blog/action-search-bar.mdx",
    ];
    expect(docsLayout(files, "https://kokonutui.com", ["ai-prompt", "action-search-bar", "toolbar"])).toEqual({
      template: "https://kokonutui.com/docs/navigation/{name}",
      guessed: false,
      pages: { dir: "apps/docs/content/docs/", base: "https://kokonutui.com/docs/" },
    });
  });

  it("ignores pages that are not components", () => {
    const files = ["apps/www/content/docs/installation.mdx", "apps/www/content/docs/components/grid.mdx"];
    expect(docsLayout(files, "https://x.dev", ["grid"]).template).toBe("https://x.dev/docs/components/{name}");
  });

  it("guesses when no docs page is found", () => {
    expect(docsLayout([], "https://x.dev", ["a"]).guessed).toBe(true);
  });
});

describe("libraryName", () => {
  it("names a library from its registry", () => {
    expect(libraryName('{"name":"kokonut-ui"}')).toBe("Kokonut UI");
    expect(libraryName('{"name":"kokonutui"}')).toBe("Kokonut UI");
    expect(libraryName('{"name":"eldoraui"}')).toBe("Eldora UI");
    expect(libraryName('{"name":"magic_ui"}')).toBe("Magic UI");
    expect(libraryName('{"name":"spec-01"}')).toBe("Spec 01");
  });

  it("returns nothing without a name", () => {
    expect(libraryName("{}")).toBeUndefined();
    expect(libraryName("not json")).toBeUndefined();
  });
});

it("firstSentence keeps the first sentence", () => {
  expect(firstSentence("A kit. With more.")).toBe("A kit.");
});

describe("hostedRegistry", () => {
  const json = JSON.stringify({
    name: "acme",
    items: [
      { name: "utils", type: "registry:lib" },
      { name: "glow-button", type: "registry:component", access: "free" },
      { name: "hero", type: "registry:block" },
      { name: "pricing", type: "registry:block", access: "pro" },
    ],
  });

  it("keeps the free items and counts the components among them", () => {
    const reg = hostedRegistry("scripts/catalog/registries/acme.json", json);
    expect(reg?.count).toBe(2);
    expect(reg?.items.map((i) => i.name)).toEqual(["utils", "glow-button", "hero"]);
    expect(reg?.path).toBe("scripts/catalog/registries/acme.json");
  });

  it("returns nothing when only Pro items list components", () => {
    const pro = JSON.stringify({ items: [{ name: "pricing", type: "registry:block", access: "pro" }] });
    expect(hostedRegistry("x.json", pro)).toBeUndefined();
  });

  it("returns nothing for a file that is not JSON", () => {
    expect(hostedRegistry("x.json", "<html>")).toBeUndefined();
  });
});
