import { matchLibrary, titleFromUrl } from "@/lib/libraries";
import { fetchJSON, fetchText, safeUrl } from "@/lib/net";
import { classify } from "@/lib/types";

export const runtime = "nodejs";

// Reads a component site (e.g. https://www.rareui.com/components) and returns
// every component it lists. It tries the most structured source first:
//   1. a shadcn registry (registry.json): names, descriptions, install commands
//   2. links on the page, under the page's path, grouped by the page headings
//   3. sitemap.xml, under the page's path

export type ImportItem = {
  url: string;
  title: string;
  description?: string;
  category?: string;
  install?: string;
  registry?: string;
  dependencies?: string[];
  type: string;
};

export type ImportResult = {
  site: string;
  library: string;
  source: "registry" | "links" | "sitemap";
  items: ImportItem[];
};

const MAX_ITEMS = 300;

type RegistryItem = {
  name: string;
  type?: string;
  title?: string;
  description?: string;
  dependencies?: string[];
  categories?: string[];
};
type Registry = { name?: string; homepage?: string; items?: RegistryItem[] };
type RegistryIndexEntry = { name: string; homepage?: string; url?: string };

const COMPONENT_TYPES = new Set(["registry:ui", "registry:component", "registry:block", undefined]);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function decode(s: string) {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Collect links under the page's path, each with the heading above it.
function scanLinks(html: string, page: URL) {
  const base = page.pathname.replace(/\/$/, "").replace(/(\/index)?\.html?$/, "");
  const found = new Map<string, { url: string; title: string; category?: string }>();
  let heading: string | undefined;
  const re = /<h([1-4])[^>]*>([\s\S]*?)<\/h\1>|<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const m of html.matchAll(re)) {
    if (m[2] !== undefined) {
      // Drop counters such as "Inputs [6]" or "Inputs (6)".
      heading = decode(m[2]).replace(/[\[(]\s*\d+\s*[\])]/g, "").trim() || heading;
      continue;
    }
    let u: URL;
    try {
      u = new URL(m[3], page);
    } catch {
      continue;
    }
    if (u.hostname !== page.hostname) continue;
    const path = u.pathname.replace(/\/$/, "");
    if (!base || !path.startsWith(base + "/")) continue;
    u.search = "";
    u.hash = "";
    const key = u.href.replace(/\/$/, "");
    const text = decode(m[4]).replace(/\bnew\b$/i, "").trim();
    const prev = found.get(key);
    if (prev) {
      // Keep the first real category; "New releases" style headings repeat items.
      if (prev.category && /new|latest|recent|featured|popular/i.test(prev.category)) prev.category = heading;
      continue;
    }
    found.set(key, { url: key, title: text && text.length < 80 ? text : titleFromUrl(key), category: heading });
  }
  return [...found.values()];
}

async function fromSitemap(page: URL) {
  const base = page.pathname.replace(/\/$/, "").replace(/(\/index)?\.html?$/, "");
  const r = await fetchText(new URL("/sitemap.xml", page).href, { accept: "application/xml" });
  if (!r) return [];
  const locs = [...r.text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  const out: { url: string; title: string }[] = [];
  for (const loc of locs) {
    try {
      const u = new URL(loc);
      if (u.hostname.replace(/^www\./, "") !== page.hostname.replace(/^www\./, "")) continue;
      if (!base || !u.pathname.replace(/\/$/, "").startsWith(base + "/")) continue;
      out.push({ url: u.href.replace(/\/$/, ""), title: titleFromUrl(u.href) });
    } catch {}
  }
  return out;
}

let indexCache: { at: number; list: RegistryIndexEntry[] } | null = null;
async function registryIndex() {
  if (indexCache && Date.now() - indexCache.at < 6 * 3600_000) return indexCache.list;
  const list = (await fetchJSON<RegistryIndexEntry[]>("https://ui.shadcn.com/r/registries.json")) ?? [];
  indexCache = { at: Date.now(), list: Array.isArray(list) ? list : [] };
  return indexCache.list;
}

type Found = { registry: Registry; install: (name: string) => string; ref: (name: string) => string };

// Look for a registry.json that belongs to this site.
async function findRegistry(page: URL, html: string, extraHtml: () => Promise<string>): Promise<Found | null> {
  const host = page.hostname.replace(/^www\./, "");
  const tryRegistry = async (url: string) => {
    const r = await fetchJSON<Registry>(url);
    return r && Array.isArray(r.items) && r.items.length ? r : null;
  };

  // a) Listed in the public shadcn registry index.
  const entry = (await registryIndex()).find((e) => {
    try {
      return e.homepage && new URL(e.homepage).hostname.replace(/^www\./, "") === host;
    } catch {
      return false;
    }
  });
  if (entry?.url) {
    for (const cand of [entry.url.replace(/\{name\}(\.json)?/, "registry.json"), new URL("/r/registry.json", page).href]) {
      if (cand.includes("{")) continue;
      const r = await tryRegistry(cand);
      if (r) return { registry: r, install: (n) => `npx shadcn@latest add ${entry.name}/${n}`, ref: (n) => `${entry.name}/${n}` };
    }
  }

  // b) A registry hosted on GitHub, referenced by the site:
  //    "npx shadcn add owner/repo/name" or raw.githubusercontent.com/owner/repo/branch/...
  const scan = async (text: string) => {
    const gh =
      text.match(/raw\.githubusercontent\.com\/([\w.-]+)\/([\w.-]+)\/([\w.-]+)\//) ??
      text.match(/shadcn(?:@[\w.-]+)?\s+add\s+([\w.-]+)\/([\w.-]+)\/[\w.-]+/);
    if (!gh) return null;
    const [owner, repo, branch] = [gh[1], gh[2], gh[3]];
    for (const b of branch ? [branch] : ["main", "master"]) {
      const r = await tryRegistry(`https://raw.githubusercontent.com/${owner}/${repo}/${b}/registry.json`);
      if (r) return { registry: r, install: (n: string) => `npx shadcn@latest add ${owner}/${repo}/${n}`, ref: (n: string) => `${owner}/${repo}/${n}` };
    }
    return null;
  };
  const viaHtml = (await scan(html)) ?? (await scan(await extraHtml()));
  if (viaHtml) return viaHtml;

  // c) The conventional location on the site itself.
  for (const p of ["/r/registry.json", "/registry.json"]) {
    const r = await tryRegistry(new URL(p, page).href);
    if (r) {
      const origin = page.origin;
      return { registry: r, install: (n) => `npx shadcn@latest add ${origin}/r/${n}.json`, ref: (n) => `${origin}/r/${n}.json` };
    }
  }
  return null;
}

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("url") ?? "";
  const page = await safeUrl(raw);
  if (!page) return Response.json({ error: "Not a public link" }, { status: 400 });

  const res = await fetchText(page.href);
  const html = res?.type.includes("html") ? res.text : "";
  const finalUrl = res ? new URL(res.url) : page;
  let links = html ? scanLinks(html, finalUrl) : [];
  let source: ImportResult["source"] = "links";
  if (links.length < 3) {
    const sm = await fromSitemap(finalUrl);
    if (sm.length > links.length) {
      links = sm;
      source = "sitemap";
    }
  }

  // Component pages often carry the install command the index page lacks.
  const extraHtml = async () => {
    const first = links[0]?.url;
    if (!first) return "";
    const r = await fetchText(first, { max: 600_000 });
    return r?.text ?? "";
  };

  const library = matchLibrary(finalUrl.href).library;
  const reg = await findRegistry(finalUrl, html, extraHtml);
  let items: ImportItem[];

  if (reg) {
    source = "registry";
    const byKey = new Map(links.map((l) => [norm(l.url.split("/").at(-1) ?? ""), l]));
    const byTitle = new Map(links.map((l) => [norm(l.title), l]));
    items = reg.registry
      .items!.filter((i) => COMPONENT_TYPES.has(i.type) && !/-demo(-\d+)?$|^demo-|example/.test(i.name))
      .map((i) => {
        const title = i.title ?? titleFromUrl(i.name);
        const link = byKey.get(norm(i.name)) ?? byTitle.get(norm(title));
        const category = link && "category" in link ? link.category : i.categories?.[0];
        return {
          url: link?.url ?? `${finalUrl.href.replace(/\/$/, "")}/${i.name}`,
          title,
          description: i.description?.slice(0, 300),
          category,
          install: reg.install(i.name),
          registry: reg.ref(i.name),
          dependencies: i.dependencies?.length ? i.dependencies.slice(0, 12) : undefined,
          type: classify({ title, name: i.name, category, description: i.description }),
        };
      });
  } else {
    items = links.map((l) => {
      const category = "category" in l ? l.category : undefined;
      return {
        url: l.url,
        title: l.title,
        category,
        install: matchLibrary(l.url).install,
        type: classify({ title: l.title, category }),
      };
    });
  }

  if (!items.length) {
    return Response.json({ error: "No components found on that page" }, { status: 404 });
  }

  const body: ImportResult = {
    site: finalUrl.hostname.replace(/^www\./, ""),
    library,
    source,
    items: items.slice(0, MAX_ITEMS),
  };
  return Response.json(body, { headers: { "cache-control": "public, s-maxage=3600" } });
}
