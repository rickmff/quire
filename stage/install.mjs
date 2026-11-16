// Quire stage installer: resolves a library's demo registry items (and everything they
// depend on) from the libraries' GitHub repos, writes the files into a Vite app, and
// generates src/demos.tsx mapping each catalog component to its demo.
//
//   node install.mjs <library> <appDir>
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

const SCRATCH = process.env.REG_CACHE || "/tmp/quire-reg";
const RAW = "https://raw.githubusercontent.com";
const REG = {
  magicui: { repo: "magicuidesign/magicui", dir: "apps/www/public/r" },
  "animate-ui": { repo: "imskyleen/animate-ui", dir: "apps/v1/apps/www/public/r" },
  shadcn: { repo: "shadcn-ui/ui", dir: "apps/v4/public/r/styles/new-york-v4" },
};
// Optional local checkouts of the registries (REG_LOCAL_<LIB>=path/to/public/r), read before GitHub.
const LOCAL = {
  magicui: process.env.REG_LOCAL_MAGICUI,
  "animate-ui": process.env.REG_LOCAL_ANIMATE_UI,
};
// The docs app of each library: demos import helpers from it and load images from its public/.
const DOCS = {
  magicui: ["magicuidesign/magicui/HEAD/apps/www"],
  "animate-ui": ["imskyleen/animate-ui/HEAD/apps/v1/apps/www", "imskyleen/animate-ui/HEAD/apps/v1/packages/ui/src"],
};

async function load(reg, name) {
  const cache = join(SCRATCH, reg, name + ".json");
  if (existsSync(cache)) return JSON.parse(readFileSync(cache, "utf8"));
  const local = LOCAL[reg] && join(LOCAL[reg], name + ".json");
  let text;
  if (local && existsSync(local)) text = readFileSync(local, "utf8");
  else {
    const r = await fetch(`${RAW}/${REG[reg].repo}/HEAD/${REG[reg].dir}/${name}.json`);
    if (!r.ok) return null;
    text = await r.text();
  }
  mkdirSync(dirname(cache), { recursive: true });
  writeFileSync(cache, text);
  return JSON.parse(text);
}

// shadcn new-york-v4 ui source straight from the repo (the published JSON there is the older style).
async function shadcnUi(name) {
  const cache = join(SCRATCH, "shadcn-src", name + ".tsx");
  let text, kind = "ui";
  if (existsSync(cache)) text = readFileSync(cache, "utf8");
  else {
    let r = await fetch(`${RAW}/shadcn-ui/ui/HEAD/apps/v4/registry/new-york-v4/ui/${name}.tsx`);
    if (!r.ok) { r = await fetch(`${RAW}/shadcn-ui/ui/HEAD/apps/v4/registry/new-york-v4/hooks/${name}.ts`); kind = "hook"; }
    if (!r.ok) return null;
    text = await r.text();
    mkdirSync(dirname(cache), { recursive: true });
    writeFileSync(cache, text);
  }
  text = text.replace(/@\/registry\/new-york-v4\/ui\//g, "@/components/ui/").replace(/@\/registry\/new-york-v4\/(lib|hooks)\//g, "@/$1/");
  const regDeps = [...text.matchAll(/from "@\/components\/ui\/([\w-]+)"/g)].map((m) => m[1]);
  const npm = [...text.matchAll(/from "([^"@.][^"]*|@[^/"]+\/[^/"]+)[^"]*"/g)].map((m) => m[1]).filter((d) => !/^(react|react-dom|cn)$/.test(d) && !d.startsWith("@/"));
  return { name, dependencies: npm, registryDependencies: regDeps, files: [kind === "hook" || /^use-/.test(name) ? { path: `hooks/${name}.ts`, type: "registry:hook", content: text } : { path: `ui/${name}.tsx`, type: "registry:ui", content: text }] };
}

// Turn a registryDependencies entry into [registry, name].
function ref(dep, from) {
  if (/^https?:/.test(dep)) {
    const u = new URL(dep);
    const n = u.pathname.split("/").pop().replace(/\.json$/, "");
    if (/magicui/.test(u.host)) return ["magicui", n];
    if (/animate-ui/.test(u.host)) return ["animate-ui", n];
    return ["shadcn", n];
  }
  let m;
  if ((m = dep.match(/^@magicui\/(.+)$/))) return ["magicui", m[1]];
  if ((m = dep.match(/^@animate-ui\/(?:v\d\/)?(.+)$/))) return ["animate-ui", m[1]];
  if (dep.startsWith("@")) return ["shadcn", dep.split("/").pop()];
  return ["shadcn", dep, from];
}

function dest(reg, f) {
  if (reg === "magicui" && f.path.startsWith("registry/")) return f.path; // imported as @/registry/...
  if (f.target) return f.target.replace(/^~\//, "");
  const base = f.path.split("/").pop();
  if (reg === "magicui") return f.path; // registry/magicui/x.tsx, registry/example/x.tsx: imported as @/registry/...
  if (f.type === "registry:lib") return `lib/${base}`;
  if (f.type === "registry:hook") return `hooks/${base}`;
  return `components/ui/${base}`;
}

const vars = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.startsWith("--") ? k : `--${k}`, v]));
function cssText(obj, indent = "") {
  let out = "";
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === "object") out += `${indent}${k} {\n${cssText(v, indent + "  ")}${indent}}\n`;
    else out += `${indent}${k}: ${v};\n`;
  }
  return out;
}

export async function install(lib, app, names) {
  const seen = new Map();
  const deps = new Set();
  const css = { theme: {}, light: {}, dark: {}, rules: {} };
  const missing = [];
  async function add(reg, name, fallback) {
    const key = `${reg}/${name}`;
    if (seen.has(key)) return seen.get(key);
    seen.set(key, null);
    let item = reg === "shadcn" ? await shadcnUi(name) : await load(reg, name);
    if (!item && fallback) item = await load(fallback, name), reg = fallback;
    if (!item) { missing.push(key); return false; }
    for (const d of item.dependencies ?? []) deps.add(d);
    for (const d of item.registryDependencies ?? []) {
      const [r, n] = ref(d);
      await add(r, n, r === "shadcn" ? lib : undefined);
    }
    for (const f of item.files ?? []) {
      if (!f.content) continue;
      const p = join(app, "src", dest(reg, f));
      mkdirSync(dirname(p), { recursive: true });
      // Keep the first writer: shared files (utils) must not be clobbered by a later copy.
      if (!existsSync(p) || reg !== "shadcn") writeFileSync(p, f.content);
    }
    if (item.cssVars) for (const s of ["theme", "light", "dark"]) Object.assign(css[s], item.cssVars[s] ?? {});
    if (item.css) Object.assign(css.rules, item.css);
    seen.set(key, item);
    return item;
  }

  // Demos whose name does not follow the library's pattern.
  const ALIAS = { "magicui/bento-grid": "bento-demo", "magicui/backlight": "backlight-svg-demo", "magicui/client-tweet-card": "tweet-card-demo" };
  const demos = [];
  for (const name of names) {
    // Demos written for Quire where the library has none.
    const custom = join(dirname(new URL(import.meta.url).pathname), "custom", lib, `${name}.tsx`);
    if (existsSync(custom)) {
      mkdirSync(join(app, "src/custom"), { recursive: true });
      writeFileSync(join(app, "src/custom", `${name}.tsx`), readFileSync(custom, "utf8"));
      await add(lib, name);
      demos.push({ name, demo: `custom/${name}`, file: `custom/${name}.tsx`, props: {} });
      continue;
    }
    const cands = ALIAS[`${lib}/${name}`] ? [ALIAS[`${lib}/${name}`]] : lib === "magicui" ? [`${name}-demo`, `${name}-demo-1`, `${name}-demo-2`, name] : [`demo-${name}`, name];
    let found = null;
    for (const c of cands) {
      const it = await load(lib, c);
      if (it && it.files?.some((f) => f.content)) { found = c; break; }
    }
    if (!found) { demos.push({ name, demo: null }); continue; }
    const item = await add(lib, found);
    const main = item.files.find((f) => f.content && /\.(t|j)sx$/.test(f.path)) ?? item.files[0];
    // Animate UI demos take their docs controls as props: use the defaults.
    const props = {};
    for (const group of Object.values(item.meta?.demoProps ?? {})) for (const [k, v] of Object.entries(group)) props[k] = v?.value;
    demos.push({ name, demo: found, file: dest(lib, main), props });
  }

  // Close over imports the registry metadata forgot: shadcn ui/hooks and npm packages.
  const { readdirSync, statSync } = await import("node:fs");
  const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
  for (let round = 0; round < 4; round++) {
    let added = 0;
    for (const file of walk(join(app, "src")).filter((f) => /\.(t|j)sx?$/.test(f))) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/from\s+["']@\/(components\/ui|hooks)\/([\w-]+)["']/g)) {
        const base = join(app, "src", m[1], m[2]);
        if (![".tsx", ".ts", ".jsx", ".js"].some((e) => existsSync(base + e))) { await add("shadcn", m[2], lib); added++; }
      }
      // Any other @/ import: a file of the library's own docs app (icons, helpers).
      for (const m of text.matchAll(/from\s+["']@\/([\w./-]+)["']/g)) {
        const rel = m[1];
        const base = join(app, "src", rel);
        if ([".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts"].some((e) => existsSync(base + e))) continue;
        const roots = DOCS[lib];
        found: for (const root of roots) for (const ext of [".tsx", ".ts", "/index.tsx", "/index.ts"]) {
          const r = await fetch(`${RAW}/${root}/${rel}${ext}`);
          if (r.ok) { mkdirSync(dirname(base + ext), { recursive: true }); writeFileSync(base + ext, await r.text()); added++; break found; }
        }
      }
      for (const m of text.matchAll(/from\s+["']((?:@[\w.-]+\/)?[\w.-]+)(?:\/[^"']*)?["']/g)) {
        const pkg = m[1];
        if (!/^(react|react-dom|cn|next)$/.test(pkg) && !pkg.startsWith(".")) deps.add(pkg);
      }
    }
    if (!added) break;
  }

  // demos.tsx: one lazy import per component, picking the default or first function export.
  let src = `import { lazy } from "react";\nconst pick = (m: any) => ({ default: m.default ?? Object.values(m).find((v) => typeof v === "function") });\nexport const demos: Record<string, any> = {\n`;
  for (const d of demos) if (d.demo) src += `  ${JSON.stringify(d.name)}: lazy(() => import(${JSON.stringify("@/" + d.file.replace(/\.(t|j)sx?$/, ""))}).then(pick)),\n`;
  src += "};\n";
  src += `export const props: Record<string, any> = ${JSON.stringify(Object.fromEntries(demos.filter((d) => d.demo && Object.keys(d.props).length).map((d) => [d.name, d.props])), null, 1)};\n`;
  writeFileSync(join(app, "src/demos.tsx"), src);

  // Site-relative assets the demos use (src="/mug.webp") come from the docs app's public/.
  const assets = new Set();
  const scan = (dir) => { for (const e of readdirSync(dir, { withFileTypes: true })) { const f = join(dir, e.name); if (e.isDirectory()) scan(f); else if (/\.(t|j)sx?$/.test(e.name)) for (const m of readFileSync(f, "utf8").matchAll(/["'`](\/[\w./-]+\.(?:png|jpe?g|webp|gif|svg|avif|mp4|webm))["'`]/g)) assets.add(m[1]); } };
  scan(join(app, "src"));
  for (const a of assets) {
    const out = join(app, "public", a);
    if (existsSync(out)) continue;
    const r = await fetch(`${RAW}/${DOCS[lib][0]}/public${a}`);
    if (!r.ok) { missing.push("asset " + a); continue; }
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, Buffer.from(await r.arrayBuffer()));
  }

  let extra = "";
  if (Object.keys(css.theme).length) extra += `@theme inline {\n${cssText(vars(css.theme), "  ")}}\n`;
  if (Object.keys(css.light).length) extra += `:root {\n${cssText(vars(css.light), "  ")}}\n`;
  if (Object.keys(css.dark).length) extra += `.dark {\n${cssText(vars(css.dark), "  ")}}\n`;
  extra += cssText(css.rules);
  writeFileSync(join(app, "src/registry.css"), extra);
  writeFileSync(join(app, "deps.json"), JSON.stringify([...deps].sort(), null, 1));
  writeFileSync(join(app, "demos.json"), JSON.stringify(demos, null, 1));
  console.log(`${lib}: ${demos.filter((d) => d.demo).length}/${names.length} demos, ${deps.size} npm deps, missing: ${missing.join(", ") || "none"}`);
}

if (process.argv[2]) {
  const [lib, app] = process.argv.slice(2);
  const cat = JSON.parse(readFileSync(new URL("../lib/catalog/data.json", import.meta.url), "utf8"));
  const names = cat.components.filter((c) => c.library === lib).map((c) => c.name);
  await install(lib, app, names);
}
