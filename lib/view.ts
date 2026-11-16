import { OTHER, TYPES, typeById } from "@/lib/types";

export type View = "starred" | null | string;
export const typeView = (v: View) => (typeof v === "string" && v.startsWith("type:") ? v.slice(5) : null);
export const siteView = (v: View) => (typeof v === "string" && v.startsWith("site:") ? v.slice(5).split("|")[0] : null);
export const groupView = (v: View) =>
  typeof v === "string" && v.startsWith("site:") && v.includes("|") ? v.slice(v.indexOf("|") + 1) : null;
export const PAGES = new Set(["starred", "libraries", "sites", "agents"]);
export const isGallery = (v: View) =>
  v === "starred" || v === "libraries" || typeView(v) !== null || siteView(v) !== null;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const FAMILIES = [...new Set([...TYPES, OTHER].map((t) => t.family))];
export function viewPath(v: View): string {
  const seg = (...p: string[]) => ["/app", ...p.map(encodeURIComponent)].join("/");
  if (v === null || v === "starred" || v === "all" || v === "library") return "/app";
  if (v === "libraries") return seg("all-libraries");
  if (v === "sites" || v === "agents") return seg(v);
  const t = typeView(v);
  if (t) return seg("types", t);
  const site = siteView(v);
  if (site) {
    const g = groupView(v);
    return g ? seg("all-libraries", site, slug(g.split("/")[1] ?? g)) : seg("all-libraries", site);
  }
  return seg("collections", v);
}
export function pathView(path: string): View {
  const [root, a, b] = path.split("/").filter(Boolean).slice(1).map(decodeURIComponent);
  if (root === "all-libraries") {
    if (!a) return "libraries";
    if (!b) return `site:${a}`;
    const family = FAMILIES.find((f) => slug(f) === b);
    return `site:${a}|${family ?? `${typeById(b).family}/${b}`}`;
  }
  if (root === "sites" || root === "agents") return root;
  if (root === "types" && a) return `type:${a}`;
  if (root === "collections" && a) return a;
  return "starred";
}
export const siteKey = (i: { library: string; site?: string }) =>
  i.library !== "mine" ? i.library : `mine-${(i.site ?? "mine").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
