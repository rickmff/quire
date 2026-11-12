// Known component libraries: detect the source library from a URL and,
// where the library publishes a shadcn registry, derive the install command.

export type LibraryMatch = { library: string; install?: string };

type Rule = {
  host: RegExp;
  library: string;
  install?: (path: string[]) => string | undefined;
};

const last = (p: string[]) => p.filter(Boolean).at(-1);

const RULES: Rule[] = [
  {
    host: /(^|\.)ui\.shadcn\.com$/,
    library: "shadcn/ui",
    install: (p) =>
      p.includes("components") ? `npx shadcn@latest add ${last(p)}` : undefined,
  },
  {
    host: /(^|\.)magicui\.design$/,
    library: "Magic UI",
    install: (p) =>
      p.includes("components") ? `npx shadcn@latest add @magicui/${last(p)}` : undefined,
  },
  {
    host: /(^|\.)ui\.aceternity\.com$/,
    library: "Aceternity UI",
    install: (p) =>
      p[0] === "components" && p.length > 1
        ? `npx shadcn@latest add @aceternity/${last(p)}`
        : undefined,
  },
  { host: /(^|\.)21st\.dev$/, library: "21st.dev" },
  { host: /(^|\.)kokonutui\.com$/, library: "Kokonut UI" },
  { host: /(^|\.)cult-ui\.com$/, library: "cult/ui" },
  { host: /(^|\.)motion-primitives\.com$/, library: "Motion Primitives" },
  { host: /(^|\.)animate-ui\.com$/, library: "Animate UI" },
  { host: /(^|\.)reactbits\.dev$/, library: "React Bits" },
  { host: /(^|\.)originui\.com$/, library: "Origin UI" },
  { host: /(^|\.)coss\.com$/, library: "coss ui" },
  { host: /(^|\.)tailark\.com$/, library: "Tailark" },
  { host: /(^|\.)uiverse\.io$/, library: "Uiverse" },
  { host: /(^|\.)hover\.dev$/, library: "Hover.dev" },
  { host: /(^|\.)fancycomponents\.dev$/, library: "Fancy Components" },
  { host: /(^|\.)skiper-ui\.com$/, library: "Skiper UI" },
  { host: /(^|\.)shadcnblocks\.com$/, library: "shadcnblocks" },
  { host: /(^|\.)ui-layouts\.com$/, library: "UI Layouts" },
  { host: /(^|\.)eldoraui\.site$/, library: "Eldora UI" },
  { host: /(^|\.)hextaui\.com$/, library: "HextaUI" },
  { host: /(^|\.)github\.com$/, library: "GitHub" },
  { host: /(^|\.)(x|twitter)\.com$/, library: "X" },
  { host: /(^|\.)codepen\.io$/, library: "CodePen" },
  { host: /(^|\.)dribbble\.com$/, library: "Dribbble" },
];

export function matchLibrary(rawUrl: string): LibraryMatch {
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname.split("/").filter(Boolean);
    for (const r of RULES) {
      if (r.host.test(host)) return { library: r.library, install: r.install?.(path) };
    }
    return { library: host };
  } catch {
    return { library: "link" };
  }
}

const TAGS: [string, RegExp][] = [
  ["button", /\bbutton/i],
  ["card", /\bcards?\b/i],
  ["hero", /\bhero/i],
  ["navbar", /\bnav(bar|igation)?\b|\bheader\b|\bmenu\b/i],
  ["pricing", /\bpricing/i],
  ["text", /\btext|typewriter|typing|heading|word/i],
  ["background", /\bbackground|gradient|grid|beams|particles|aurora|noise/i],
  ["carousel", /\bcarousel|slider|marquee/i],
  ["modal", /\bmodal|dialog|drawer|sheet/i],
  ["form", /\bform|input|select|checkbox|login|signup/i],
  ["chart", /\bchart|graph/i],
  ["table", /\btable|data.?grid/i],
  ["footer", /\bfooter/i],
  ["testimonial", /\btestimonial/i],
  ["motion", /\banimat|motion|hover|scroll|parallax|spring/i],
  ["3d", /\b3d\b|three|globe/i],
];

export function autoTags(...texts: (string | undefined)[]): string[] {
  const s = texts.filter(Boolean).join(" ").replace(/[-_/]/g, " ");
  return TAGS.filter(([, re]) => re.test(s)).map(([t]) => t).slice(0, 4);
}

const SKIP = new Set(["default", "docs", "components", "component", "r", "community", "preview", "demo"]);

export function titleFromUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    const seg = u.pathname.split("/").filter((s) => s && !SKIP.has(s.toLowerCase())).at(-1);
    const t = (seg ?? u.hostname.replace(/^www\./, "")).replace(/[-_]+/g, " ");
    return t.charAt(0).toUpperCase() + t.slice(1);
  } catch {
    return rawUrl;
  }
}
