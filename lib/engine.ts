export type EngineId = "radix" | "base-ui" | "headless-ui" | "react-aria" | "ui-sdk";

export const ENGINES: Record<EngineId, { name: string; url: string }> = {
  radix: { name: "Radix", url: "https://www.radix-ui.com" },
  "base-ui": { name: "Base UI", url: "https://base-ui.com" },
  "headless-ui": { name: "Headless UI", url: "https://headlessui.com" },
  "react-aria": { name: "React Aria", url: "https://react-spectrum.adobe.com/react-aria" },
  "ui-sdk": { name: "UI SDK", url: "https://ui-sdk.dev" },
};

export const UI_SDK_DOCS = "https://ui-sdk.dev/docs/react";

const BY_DEPENDENCY: [RegExp, EngineId][] = [
  [/^@ui-sdk\//, "ui-sdk"],
  [/^(react-aria|react-aria-components|@react-aria\/.+)$/, "react-aria"],
  [/^@base-ui(-components)?\/react$/, "base-ui"],
  [/^@headlessui\/react$/, "headless-ui"],
  [/^(radix-ui|@radix-ui\/react-(?!icons$).+)$/, "radix"],
];

const BY_NAME: [RegExp, EngineId][] = [
  [/(^|-)radix-/, "radix"],
  [/(^|-)base-/, "base-ui"],
  [/(^|-)headless-/, "headless-ui"],
  [/(^|-)aria-/, "react-aria"],
];

export function engineOf(c: { name: string; dependencies?: string[] }): EngineId | undefined {
  for (const [re, id] of BY_NAME) if (re.test(c.name)) return id;
  for (const dep of c.dependencies ?? []) for (const [re, id] of BY_DEPENDENCY) if (re.test(dep)) return id;
  return undefined;
}

export const engineName = (id?: string) => (id && id in ENGINES ? ENGINES[id as EngineId].name : undefined);

export const engineById = (q?: string) => {
  const s = q?.toLowerCase().replace(/[\s_]+/g, "-");
  if (!s) return undefined;
  return (Object.keys(ENGINES) as EngineId[]).find(
    (id) => id === s || ENGINES[id].name.toLowerCase() === q!.toLowerCase(),
  );
};

const UI_SDK_PARTS: Record<string, string[]> = {
  modal: ["dialog", "alert-dialog"],
  drawer: ["drawer"],
  popover: ["popover", "menu", "hover-card"],
  tooltip: ["tooltip", "hover-card"],
  tabs: ["tabs", "segmented-control"],
  navbar: ["navigation-menu", "menubar"],
  pagination: ["pagination"],
  command: ["command"],
  otp: ["otp-input"],
  password: ["password-input"],
  picker: ["date-picker", "calendar", "time-input", "color-picker"],
  "file-upload": ["file-input"],
  select: ["select", "combobox", "autocomplete"],
  toggle: ["switch", "checkbox", "radio", "toggle"],
  slider: ["slider"],
  form: ["field", "label", "input"],
  button: ["button"],
  input: ["input", "textarea", "token-input"],
  toast: ["toast"],
  notification: ["toast", "alert-dialog"],
  progress: ["progress", "meter"],
  faq: ["accordion", "collapsible"],
  timeline: ["timeline"],
  avatar: ["avatar"],
  carousel: ["carousel"],
  list: ["listbox", "tree"],
};

const UI_SDK_EXPORTS = [
  ...new Set(Object.values(UI_SDK_PARTS).flat()),
  "hover-card",
  "scroll-area",
  "toolbar",
  "rating",
  "number-input",
  "resizable",
];

const NAME_ALIASES: [RegExp, string][] = [
  [/dropdown-menu|context-menu/, "menu"],
  [/radio-group/, "radio"],
  [/toggle-group/, "toggle"],
  [/sheet/, "drawer"],
  [/disclosure/, "collapsible"],
  [/preview-card|preview-link-card/, "hover-card"],
];

export function uiSdkParts(c: { type: string; name?: string }) {
  const name = c.name ?? "";
  const named = UI_SDK_EXPORTS.filter((p) => new RegExp(`(^|-)${p}($|-)`).test(name));
  const alias = NAME_ALIASES.filter(([re]) => re.test(name)).map(([, p]) => p);
  const found = [...new Set([...alias, ...named])].filter(
    (p, _, all) => !all.some((q) => q !== p && q.endsWith(`-${p}`)),
  );
  return found.length ? found : (UI_SDK_PARTS[c.type] ?? []);
}

export function rebuildPrompt(
  item: { id: string; name?: string; title: string; type: string; docs: string; engine?: string },
  site: string,
) {
  const parts = uiSdkParts(item);
  if (!parts.length || item.engine === "ui-sdk") return null;
  const from = engineName(item.engine);
  return [
    `Rebuild ${item.title} (${site}) on UI SDK.`,
    `Keep its look and motion from the reference: ${item.docs}`,
    `Take the behavior from UI SDK${from ? ` instead of ${from}` : ""}: focus, keyboard, dismissal and ARIA.`,
    `Use ${parts.map((p) => `@ui-sdk/react/${p}`).join(", ")}. Install with npm install @ui-sdk/react. Docs: ${UI_SDK_DOCS}`,
    "Animate transform and opacity only, and honor prefers-reduced-motion.",
    !item.id.startsWith("mine/") && `Quire id: ${item.id} (get_component_source in the Quire MCP returns its code)`,
  ]
    .filter(Boolean)
    .join("\n");
}
