export type Source = {
  id: string;
  name: string;
  url: string;
  blurb: string;
  repo?: string;
  branch?: string;
  kind: "registry" | "mdx" | "pages" | "manual";
  path?: string;
  pattern?: RegExp;
  live?: string;
  docs: (name: string, category?: string) => string;
  item?: (name: string) => string;
  install?: (name: string) => string;
  variant?: RegExp;
  prefer?: string[];
  skip?: RegExp;
  pathHint?: (name: string) => RegExp | undefined;
  code?: (name: string, category: string) => string[];
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
    docs: (n) =>
      `https://animate-ui.com/docs/${n.replace(/^(components|primitives)-/, "$1/").replace(/^(components|primitives)\/(animate|radix|base|headless|buttons|backgrounds|community|effects|texts)-/, "$1/$2/")}`,
    item: (n) => `https://animate-ui.com/r/${n}.json`,
    install: (n) => shadcnAdd(`@animate-ui/${n}`),
    skip: /^(demo|icons)-/,
  },
];
