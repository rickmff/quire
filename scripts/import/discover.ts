import type { Registry, RegistryItem } from "../../lib/catalog/registry.ts";

export type DirectoryEntry = { name: string; homepage?: string; url?: string; description?: string };

export const COMPONENT_TYPES = new Set(["registry:ui", "registry:component", "registry:block"]);

const host = (u: string) => {
  try {
    return new URL(/^https?:/.test(u) ? u : `https://${u}`).host.replace(/^www\./, "");
  } catch {
    return "";
  }
};

export function findInDirectory(directory: DirectoryEntry[], input: string) {
  const h = host(input);
  const scope = input.replace(/^@/, "");
  return (
    directory.find((d) => d.homepage && host(d.homepage) === h && h) ??
    directory.find((d) => d.url && host(d.url) === h && h) ??
    directory.find((d) => d.name.replace(/^@/, "") === scope)
  );
}

export function repoFromHtml(html: string) {
  const counts = new Map<string, number>();
  for (const m of html.matchAll(/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?=["'/?#\s)])/g)) {
    const repo = `${m[1]}/${m[2]}`;
    if (/^(shadcn-ui|vercel|facebook|tailwindlabs|radix-ui|sponsors|orgs)\//i.test(repo)) continue;
    counts.set(repo, (counts.get(repo) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
}

const itemsOf = (reg: Registry | RegistryItem[]) => (Array.isArray(reg) ? reg : (reg.items ?? []));

export function pickRegistry(files: string[], read: (path: string) => string) {
  const candidates = files
    .filter((f) => /(^|\/)registry\.json$/.test(f) && !/node_modules|\/r\/styles\//.test(f))
    .sort((a, b) => Number(/public\/r\//.test(b)) - Number(/public\/r\//.test(a)) || a.length - b.length);
  let best: { path: string; items: RegistryItem[]; count: number } | undefined;
  for (const path of candidates) {
    let items: RegistryItem[];
    try {
      items = itemsOf(JSON.parse(read(path)));
    } catch {
      continue;
    }
    const count = items.filter((i) => COMPONENT_TYPES.has(i.type ?? "")).length;
    if (count && (!best || count > best.count)) best = { path, items, count };
  }
  if (!best) return undefined;
  const dir = best.path.replace(/\/?registry\.json$/, "");
  const built = files.filter((f) => f.startsWith(dir ? `${dir}/` : "") && f.endsWith(".json")).length > best.count;
  const root = /(^|\/)public\/r$/.test(dir) ? dir.replace(/\/?public\/r$/, "") : dir;
  return { path: best.path, dir, root, built, items: best.items, count: best.count };
}

export function demoStyle(items: RegistryItem[]): "suffix" | "prefix" {
  const names = items.map((i) => i.name);
  const suffix = names.filter((n) => /-demo(-\d+)?$/.test(n)).length;
  const prefix = names.filter((n) => /^demo-/.test(n)).length;
  return prefix > suffix ? "prefix" : "suffix";
}

export function docsTemplate(files: string[], homepage: string, names: string[]) {
  const base = homepage.replace(/\/$/, "");
  for (const name of names) {
    const hit = files.find((f) => f.endsWith(`/${name}.mdx`) && /\/docs\//.test(f));
    if (!hit) continue;
    const rel = hit.slice(hit.lastIndexOf("/docs/") + 1, -".mdx".length);
    return { template: `${base}/${rel.slice(0, -name.length)}{name}`, guessed: false };
  }
  return { template: `${base}/docs/components/{name}`, guessed: true };
}

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const firstSentence = (s = "") => (s.match(/^[^.!?]*[.!?]/)?.[0] ?? s).trim();
