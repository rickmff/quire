import { fetchText } from "./net";
import type { CatalogComponent } from "./catalog/schema";

// Reads the real source code of a component, for agents.
// 1. The live shadcn registry item on the site: JSON with every file inline.
// 2. The files in the site's GitHub repo.

export type SourceFile = { path: string; content: string; truncated?: boolean };
export type SourceResult = { from: string; files: SourceFile[]; dependencies?: string[]; registryDependencies?: string[] };

const MAX_FILE = 40_000;
const MAX_TOTAL = 120_000;
const cache = new Map<string, { at: number; value: SourceResult | null }>();

function clip(files: SourceFile[]) {
  let total = 0;
  return files
    .filter((f) => f.content)
    .map((f) => {
      const room = Math.max(0, Math.min(MAX_FILE, MAX_TOTAL - total));
      total += Math.min(f.content.length, room);
      return f.content.length > room ? { ...f, content: f.content.slice(0, room), truncated: true } : f;
    })
    .filter((f) => f.content.length);
}

async function fromRegistry(url: string): Promise<SourceResult | null> {
  const r = await fetchText(url, { accept: "application/json", timeout: 8000 });
  if (!r) return null;
  try {
    const item = JSON.parse(r.text);
    const files: SourceFile[] = (item.files ?? [])
      .filter((f: any) => typeof f?.content === "string")
      .map((f: any) => ({ path: f.target || f.path, content: f.content }));
    if (!files.length) return null;
    return { from: url, files: clip(files), dependencies: item.dependencies, registryDependencies: item.registryDependencies };
  } catch {
    return null;
  }
}

async function fromGitHub(repo: string, paths: string[]): Promise<SourceResult | null> {
  const files: SourceFile[] = [];
  for (const p of paths.slice(0, 6)) {
    const url = `https://raw.githubusercontent.com/${repo}/HEAD/${p.split("/").map(encodeURIComponent).join("/")}`;
    const r = await fetchText(url, { accept: "text/plain", timeout: 8000 });
    if (r) files.push({ path: p, content: r.text });
  }
  return files.length ? { from: `https://github.com/${repo}`, files: clip(files) } : null;
}

export async function readSource(c: CatalogComponent): Promise<SourceResult | null> {
  const key = c.id;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 3600_000) return hit.value;
  let value: SourceResult | null = null;
  if (c.item && /^https:\/\//.test(c.item)) value = await fromRegistry(c.item);
  if (!value && c.repo && c.files?.length) value = await fromGitHub(c.repo, c.files);
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 500) cache.delete(cache.keys().next().value!);
  return value;
}
