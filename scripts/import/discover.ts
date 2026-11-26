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

export function hostedRegistry(path: string, json: string) {
  let items: RegistryItem[];
  try {
    items = itemsOf(JSON.parse(json)).filter((i) => i.access !== "pro");
  } catch {
    return undefined;
  }
  const count = items.filter((i) => COMPONENT_TYPES.has(i.type ?? "")).length;
  if (!count) return undefined;
  return { path, dir: "", root: "", built: false, items, count };
}

export function demoStyle(items: RegistryItem[]): "suffix" | "prefix" {
  const names = items.map((i) => i.name);
  const suffix = names.filter((n) => /-demo(-\d+)?$/.test(n)).length;
  const prefix = names.filter((n) => /^demo-/.test(n)).length;
  return prefix > suffix ? "prefix" : "suffix";
}

export function docsLayout(files: string[], homepage: string, names: string[]) {
  const base = homepage.replace(/\/$/, "");
  const wanted = new Set(names);
  const hits = files
    .filter((f) => f.endsWith(".mdx") && f.includes("/docs/"))
    .map((f) => {
      const at = f.lastIndexOf("/docs/") + "/docs/".length;
      const rel = f.slice(at, -".mdx".length);
      return { dir: f.slice(0, at), rel, name: rel.split("/").pop()! };
    })
    .filter((h) => wanted.has(h.name));
  if (!hits.length) return { template: `${base}/docs/components/{name}`, guessed: true };
  const count = <T>(list: T[]) =>
    [...list.reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map<T, number>())].sort((a, b) => b[1] - a[1])[0][0];
  const dir = count(hits.map((h) => h.dir));
  const folder = count(hits.filter((h) => h.dir === dir).map((h) => h.rel.slice(0, -h.name.length)));
  const folders = new Set(hits.filter((h) => h.dir === dir).map((h) => h.rel.slice(0, -h.name.length)));
  return {
    template: `${base}/docs/${folder}{name}`,
    guessed: false,
    ...(folders.size > 1 ? { pages: { dir, base: `${base}/docs/` } } : {}),
  };
}

export function libraryName(registryJson?: string) {
  try {
    const name: string | undefined = JSON.parse(registryJson ?? "{}").name;
    return name
      ?.replace(/[-_]+/g, " ")
      .replace(/\s*ui$/i, " UI")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return undefined;
  }
}

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const firstSentence = (s = "") => (s.match(/^[^.!?]*[.!?]/)?.[0] ?? s).trim();
