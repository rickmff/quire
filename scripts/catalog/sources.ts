// The curated starter library: component sites people share most on X.
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
const kebab = (s: string) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();

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
    id: "aceternity",
    name: "Aceternity UI",
    url: "https://ui.aceternity.com",
    blurb: "Showcase effects: beams, spotlights, 3D cards, parallax.",
    kind: "manual",
    docs: (n) => `https://ui.aceternity.com/components/${n}`,
    item: (n) => `https://ui.aceternity.com/registry/${n}.json`,
    install: (n) => shadcnAdd(`@aceternity/${n}`),
  },
  {
    id: "reactbits",
    name: "React Bits",
    url: "https://reactbits.dev",
    blurb: "Text animations, backgrounds and interactive effects.",
    repo: "DavidHDev/react-bits",
    kind: "registry",
    path: "public/r/registry.json",
    live: "https://reactbits.dev/r/registry.json",
    docs: (n, c) => (c ? `https://reactbits.dev/${kebab(c)}/${kebab(n)}` : "https://reactbits.dev"),
    item: (n) => `https://reactbits.dev/r/${n}.json`,
    install: (n) => shadcnAdd(`@react-bits/${n}`),
    variant: /-(JS|TS)(-(CSS|TW))?$/,
    prefer: ["-TS-TW", "-TS", "-TS-CSS", "-JS-TW", "-JS", "-JS-CSS"],
    skip: /^Sound[A-Z]/,
    pathHint: (n) => (/-TS-TW$/.test(n) ? /ts-tailwind/ : /-TS$/.test(n) ? /ts-default/ : /-JS-TW$/.test(n) ? /\/tailwind\// : undefined),
  },
  {
    id: "motion-primitives",
    name: "Motion Primitives",
    url: "https://motion-primitives.com",
    blurb: "Small motion building blocks for React.",
    repo: "ibelick/motion-primitives",
    kind: "registry",
    path: "public/c/registry.json",
    docs: (n) => `https://motion-primitives.com/docs/${n}`,
    item: (n) => `https://motion-primitives.com/c/${n}.json`,
    install: (n) => shadcnAdd(`@motion-primitives/${n}`),
  },
  {
    id: "cult-ui",
    name: "Cult UI",
    url: "https://www.cult-ui.com",
    blurb: "Tactile shadcn components and AI blocks.",
    repo: "nolly-studio/cult-ui",
    kind: "registry",
    path: "apps/www/public/r/registry.json",
    docs: (n) => `https://www.cult-ui.com/docs/components/${n}`,
    item: (n) => `https://cult-ui.com/r/${n}.json`,
    install: (n) => shadcnAdd(`@cult-ui/${n}`),
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
  {
    id: "kokonut",
    name: "Kokonut UI",
    url: "https://kokonutui.com",
    blurb: "Polished interactive components and AI inputs.",
    repo: "kokonut-labs/kokonutui",
    kind: "registry",
    path: "public/r/registry.json",
    docs: (n) => `https://kokonutui.com/docs/components/${n}`,
    item: (n) => `https://kokonutui.com/r/${n}.json`,
    install: (n) => shadcnAdd(`@kokonutui/${n}`),
  },
  {
    id: "eldora",
    name: "Eldora UI",
    url: "https://www.eldoraui.site",
    blurb: "Device mockups, globes and animated sections.",
    repo: "karthikmudunuri/eldoraui",
    kind: "registry",
    path: "apps/www/public/r/registry.json",
    docs: (n) => `https://www.eldoraui.site/docs/components/${n}`,
    item: (n) => `https://eldoraui.site/r/${n}.json`,
    install: (n) => shadcnAdd(`@eldoraui/${n}`),
  },
  {
    id: "spell",
    name: "Spell UI",
    url: "https://spell.sh",
    blurb: "Refined micro-interactions and text effects.",
    repo: "xxtomm/spell-ui",
    kind: "registry",
    path: "public/r/registry.json",
    docs: (n) => `https://spell.sh/docs/${n}`,
    item: (n) => `https://spell.sh/r/${n}.json`,
    install: (n) => shadcnAdd(`@spell/${n}`),
  },
  {
    id: "scrollx",
    name: "ScrollX UI",
    url: "https://www.scrollxui.dev",
    blurb: "Animated, scroll-driven shadcn components.",
    repo: "Adityakishore0/ScrollX-UI",
    kind: "registry",
    path: "registry.json",
    docs: (n) => `https://www.scrollxui.dev/docs/components/${n}`,
    item: (n) => `https://www.scrollxui.dev/registry/${n}.json`,
    install: (n) => shadcnAdd(`@scrollxui/${n}`),
  },
  {
    id: "hextaui",
    name: "HextaUI",
    url: "https://hextaui.com",
    blurb: "Accessible components on Base UI with motion details.",
    repo: "preetsuthar17/HextaUI",
    kind: "registry",
    path: "registry.json",
    docs: (n) => `https://hextaui.com/docs/components/${n}`,
    item: (n) => `https://hextaui.com/r/${n}.json`,
    install: (n) => shadcnAdd(`@hextaui/${n}`),
  },
  {
    id: "coss",
    name: "coss ui",
    url: "https://coss.com/ui",
    blurb: "The successor of Origin UI: a large set of app components.",
    repo: "origin-space/originui",
    kind: "registry",
    path: "apps/ui/public/r/registry.json",
    docs: (n) => `https://coss.com/ui/docs/components/${n}`,
    item: (n) => `https://coss.com/ui/r/${n}.json`,
    install: (n) => shadcnAdd(`@coss/${n}`),
    skip: /^(p|c)-|^ui$/,
  },
  {
    id: "reui",
    name: "ReUI",
    url: "https://reui.io",
    blurb: "Data-heavy app components: cascaders, grids, filters.",
    repo: "keenthemes/reui",
    kind: "registry",
    path: "public/r/styles/base-luma/registry.json",
    docs: (n) => `https://reui.io/docs/${n}`,
    item: (n) => `https://reui.io/r/${n}.json`,
    install: (n) => shadcnAdd(`@reui/${n}`),
    skip: /-(lib|context|item|i18n|draft|types|utils|builder)$/,
  },
  {
    id: "shadcn",
    name: "shadcn/ui",
    url: "https://ui.shadcn.com",
    blurb: "The base layer most of these libraries build on.",
    repo: "shadcn-ui/ui",
    kind: "registry",
    path: "apps/v4/public/r/index.json",
    docs: (n) => `https://ui.shadcn.com/docs/components/${n}`,
    item: (n) => `https://ui.shadcn.com/r/styles/new-york-v4/${n}.json`,
    install: (n) => `npx shadcn@latest add ${n}`,
  },
  {
    id: "rareui",
    name: "RareUI",
    url: "https://www.rareui.com",
    blurb: "iOS-like micro-interactions and AI interface pieces.",
    kind: "manual",
    live: "https://www.rareui.com/r/registry.json",
    docs: (n) => `https://www.rareui.com/components/${n}`,
    item: (n) => `https://www.rareui.com/r/${n}.json`,
    install: (n) => shadcnAdd(`https://www.rareui.com/r/${n}.json`),
  },
  {
    id: "animata",
    name: "Animata",
    url: "https://animata.design",
    blurb: "Hand-crafted interaction animations, free to copy.",
    repo: "codse/animata",
    kind: "mdx",
    pattern: /^content\/docs\/(?!contributing|getting-started|guide|changelog|changelogs)([^/]+)\/([^/]+)\.mdx$/,
    docs: (n, c) => `https://animata.design/docs/${c}/${n}`,
    code: (n, c) => [`animata/${c}/${n}.tsx`],
  },
  {
    id: "fancy",
    name: "Fancy Components",
    url: "https://www.fancycomponents.dev",
    blurb: "Playful, experimental motion components.",
    repo: "danielpetho/fancy",
    kind: "mdx",
    pattern: /^src\/content\/docs\/components\/([^/]+)\/([^/]+)\.mdx$/,
    docs: (n, c) => `https://www.fancycomponents.dev/docs/components/${c}/${n}`,
    code: (n, c) => [`src/fancy/components/${c}/${n}.tsx`],
    item: (n) => `https://fancycomponents.dev/r/${n}.json`,
    install: (n) => shadcnAdd(`@fancy/${n}`),
  },
  {
    id: "smoothui",
    name: "SmoothUI",
    url: "https://smoothui.dev",
    blurb: "Smooth, animated components with AI patterns.",
    repo: "educlopez/smoothui",
    kind: "mdx",
    pattern: /^apps\/docs\/content\/docs\/(components)\/([^/]+)\.mdx$/,
    docs: (n) => `https://smoothui.dev/docs/components/${n}`,
    code: (n) => [`packages/smoothui/components/${n}/index.tsx`],
    item: (n) => `https://smoothui.dev/r/${n}.json`,
    install: (n) => shadcnAdd(`@smoothui/${n}`),
  },
  {
    id: "syntaxui",
    name: "SyntaxUI",
    url: "https://syntaxui.com",
    blurb: "Tailwind and Motion components, effects and hover animations.",
    repo: "Ansub/SyntaxUI",
    kind: "pages",
    pattern: /^src\/app\/\(docs\)\/(components|effects|animations)\/([^/]+)\/page\.mdx$/,
    docs: (n, c) => `https://syntaxui.com/${c}/${n}`,
  },
];
