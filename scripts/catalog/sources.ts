// The curated starter library. Kept to two libraries so every preview can be
// rendered on the Quire stage (stage/) and checked by hand.
// Each source says where its component list lives and how to build the
// links for one component (docs page, live registry item, install command).
//
// kinds:
//   registry  a shadcn registry.json in the site's GitHub repo
//   mdx       docs pages in the repo, one .mdx per component (title + description in front matter)
//   pages     a docs folder in the repo, one page per component (name only)
//   manual    a list kept in manual.json (no public repo)

export type Source = {
  id: string;
  name: string;
  url: string;
  blurb: string;
  repo?: string;
  branch?: string;
  kind: "registry" | "mdx" | "pages" | "manual";
  // registry: path of registry.json in the repo. mdx/pages: a regex on repo paths.
  path?: string;
  pattern?: RegExp;
  // Live registry index on the site, tried first when the network allows it.
  live?: string;
  docs: (name: string, category?: string) => string;
  item?: (name: string) => string;
  install?: (name: string) => string;
  // Registry names that are variants of one component (React Bits ships JS/TS x CSS/TW).
  variant?: RegExp;
  // Variant suffixes in order of preference.
  prefer?: string[];
  // Registry names that are not components (demos, icon sets, sounds).
  skip?: RegExp;
  // When several repo files match a registry path, prefer the one matching this.
  pathHint?: (name: string) => RegExp | undefined;
  // Source files for mdx/pages sources, as repo paths.
  code?: (name: string, category: string) => string[];
  // Docs pages kept as .mdx in the repo: a name found under dir links to
  // base + its path there, e.g. content/docs/blocks/hero/hero1.mdx -> /docs/blocks/hero/hero1.
  docsPages?: { dir: string; base: string };
};

const shadcnAdd = (url: string) => `npx shadcn@latest add ${url}`;

export const SOURCES: Source[] = [
  {
    id: "magicui",
    name: "Magic UI",
    url: "https://magicui.design",
    blurb: "Animated components and effects for landing pages.",
    repo: "magicuidesign/magicui",
    kind: "registry",
    path: "apps/www/public/r/registry.json",
    live: "https://magicui.design/r/registry.json",
    docs: (n) => `https://magicui.design/docs/components/${n}`,
    item: (n) => `https://magicui.design/r/${n}.json`,
    install: (n) => shadcnAdd(`@magicui/${n}`),
  },
  {
    id: "animate-ui",
    name: "Animate UI",
    url: "https://animate-ui.com",
    blurb: "Animated primitives and components built on Motion.",
    repo: "imskyleen/animate-ui",
    kind: "registry",
    path: "apps/v1/apps/www/public/r/registry.json",
    docs: (n) => `https://animate-ui.com/docs/${n.replace(/^(components|primitives)-/, "$1/").replace(/^(components|primitives)\/(animate|radix|base|headless|buttons|backgrounds|community|effects|texts)-/, "$1/$2/")}`,
    item: (n) => `https://animate-ui.com/r/${n}.json`,
    install: (n) => shadcnAdd(`@animate-ui/${n}`),
    skip: /^(demo|icons)-/,
  },
];
