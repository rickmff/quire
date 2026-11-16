import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

const SCRATCH = process.env.REG_CACHE || "/tmp/quire-reg";
const RAW = "https://raw.githubusercontent.com";
const REG = {
  magicui: { repo: "magicuidesign/magicui", dir: "apps/www/public/r" },
  "animate-ui": { repo: "imskyleen/animate-ui", dir: "apps/v1/apps/www/public/r" },
  shadcn: { repo: "shadcn-ui/ui", dir: "apps/v4/public/r/styles/new-york-v4" },
};
const LOCAL = {
  magicui: process.env.REG_LOCAL_MAGICUI,
  "animate-ui": process.env.REG_LOCAL_ANIMATE_UI,
};
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

async function shadcnUi(name) {
  const cache = join(SCRATCH, "shadcn-src", name + ".tsx");
  let text,
    kind = "ui";
  if (existsSync(cache)) text = readFileSync(cache, "utf8");
  else {
    let r = await fetch(`${RAW}/shadcn-ui/ui/HEAD/apps/v4/registry/new-york-v4/ui/${name}.tsx`);
    if (!r.ok) {
      r = await fetch(`${RAW}/shadcn-ui/ui/HEAD/apps/v4/registry/new-york-v4/hooks/${name}.ts`);
      kind = "hook";
    }
    if (!r.ok) return null;
    text = await r.text();
    mkdirSync(dirname(cache), { recursive: true });
    writeFileSync(cache, text);
  }
  text = text
    .replace(/@\/registry\/new-york-v4\/ui\//g, "@/components/ui/")
    .replace(/@\/registry\/new-york-v4\/(lib|hooks)\//g, "@/$1/");
  const regDeps = [...text.matchAll(/from "@\/components\/ui\/([\w-]+)"/g)].map((m) => m[1]);
  const npm = [...text.matchAll(/from "([^"@.][^"]*|@[^/"]+\/[^/"]+)[^"]*"/g)]
    .map((m) => m[1])
    .filter((d) => !/^(react|react-dom|cn)$/.test(d) && !d.startsWith("@/"));
  return {
    name,
    dependencies: npm,
    registryDependencies: regDeps,
    files: [
      kind === "hook" || /^use-/.test(name)
        ? { path: `hooks/${name}.ts`, type: "registry:hook", content: text }
        : { path: `ui/${name}.tsx`, type: "registry:ui", content: text },
    ],
  };
}

function ref(dep, from) {
  if (/^https?:/.test(dep)) {
    const u = new URL(dep);
    const n = u.pathname
      .split("/")
      .pop()
      .replace(/\.json$/, "");
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
  if (reg === "magicui" && f.path.startsWith("registry/")) return f.path;
  if (f.target) return f.target.replace(/^~\//, "");
  const base = f.path.split("/").pop();
  if (reg === "magicui") return f.path;
  if (f.type === "registry:lib") return `lib/${base}`;
  if (f.type === "registry:hook") return `hooks/${base}`;
  return `components/ui/${base}`;
}

const NAMES = {
  btt: "Bottom to top",
  ttb: "Top to bottom",
  ltr: "Left to right",
  rtl: "Right to left",
  xs: "Extra small",
  sm: "Small",
  md: "Medium",
  lg: "Large",
  "icon-sm": "Icon small",
  "icon-lg": "Icon large",
  svg: "SVG",
  cta: "CTA",
  "3d": "3D",
};
const words = (k) =>
  NAMES[String(k).toLowerCase()] ??
  String(k)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/-/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
function variantsOf(item) {
  const groups = [];
  for (const props of Object.values(item.meta?.demoProps ?? {}))
    for (const [k, v] of Object.entries(props)) {
      if (v?.options && Object.keys(v.options).length > 1)
        groups.push({
          key: k,
          label: words(k),
          value: v.value,
          options: Object.entries(v.options).map(([l, val]) => ({ value: val, label: words(l) })),
        });
      else if (typeof v?.value === "boolean")
        groups.push({
          key: k,
          label: words(k),
          value: v.value,
          options: [
            { value: true, label: "On" },
            { value: false, label: "Off" },
          ],
        });
    }
  return groups.length ? { variants: groups } : {};
}
function exampleLabel(name, example) {
  let s = example.slice(name.length).replace(/^-/, "");
  if (!s || s === "demo") return "Default";
  s = s.replace(/-demo$/, "").replace(/^demo-(?!\d)/, "");
  return words(s);
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
    if (!item && fallback) ((item = await load(fallback, name)), (reg = fallback));
    if (!item) {
      missing.push(key);
      return false;
    }
    for (const d of item.dependencies ?? []) deps.add(d);
    for (const d of item.registryDependencies ?? []) {
      const [r, n] = ref(d);
      await add(r, n, r === "shadcn" ? lib : undefined);
    }
    for (const f of item.files ?? []) {
      if (!f.content) continue;
      const p = join(app, "src", dest(reg, f));
      mkdirSync(dirname(p), { recursive: true });
      if (!existsSync(p) || reg !== "shadcn") writeFileSync(p, f.content);
    }
    if (item.cssVars) for (const s of ["theme", "light", "dark"]) Object.assign(css[s], item.cssVars[s] ?? {});
    if (item.css) Object.assign(css.rules, item.css);
    seen.set(key, item);
    return item;
  }

  const ALIAS = {
    "magicui/bento-grid": "bento-demo",
    "magicui/backlight": "backlight-svg-demo",
    "magicui/client-tweet-card": "tweet-card-demo",
  };
  const demos = [];
  for (const name of names) {
    const custom = join(dirname(new URL(import.meta.url).pathname), "custom", lib, `${name}.tsx`);
    if (existsSync(custom)) {
      mkdirSync(join(app, "src/custom"), { recursive: true });
      writeFileSync(join(app, "src/custom", `${name}.tsx`), readFileSync(custom, "utf8"));
      await add(lib, name);
      demos.push({ name, demo: `custom/${name}`, file: `custom/${name}.tsx`, props: {} });
      continue;
    }
    const cands = ALIAS[`${lib}/${name}`]
      ? [ALIAS[`${lib}/${name}`]]
      : lib === "magicui"
        ? [`${name}-demo`, `${name}-demo-1`, `${name}-demo-2`, name]
        : [`demo-${name}`, name];
    let found = null;
    for (const c of cands) {
      const it = await load(lib, c);
      if (it && it.files?.some((f) => f.content)) {
        found = c;
        break;
      }
    }
    if (!found) {
      demos.push({ name, demo: null });
      continue;
    }
    const item = await add(lib, found);
    const main = item.files.find((f) => f.content && /\.(t|j)sx$/.test(f.path)) ?? item.files[0];
    const props = {};
    for (const group of Object.values(item.meta?.demoProps ?? {}))
      for (const [k, v] of Object.entries(group)) props[k] = v?.value;
    demos.push({ name, demo: found, file: dest(lib, main), props, ...variantsOf(item) });
  }

  if (lib === "magicui") {
    const index = await (await fetch(`${RAW}/${REG.magicui.repo}/HEAD/${REG.magicui.dir}/registry.json`)).json();
    const examples = index.items.filter((i) => i.type === "registry:example").map((i) => i.name);
    for (const d of demos) {
      if (!d.demo || d.file.startsWith("custom/")) continue;
      const mine = examples.filter(
        (e) =>
          (e === d.name || e.startsWith(d.name + "-")) &&
          !names.some((m) => m.length > d.name.length && (e === m || e.startsWith(m + "-"))),
      );
      if (mine.length < 2 || !mine.includes(d.demo)) continue;
      const options = [{ value: "", label: exampleLabel(d.name, d.demo) }];
      d.examples = {};
      for (const e of mine.filter((x) => x !== d.demo)) {
        const item = await add(lib, e);
        const f = item && item.files?.find((f) => f.content && /\.(t|j)sx$/.test(f.path));
        if (!f) continue;
        d.examples[e] = dest(lib, f);
        options.push({ value: e, label: exampleLabel(d.name, e) });
      }
      if (options.length > 1) d.variants = [{ key: "v", label: "Example", options }];
      else delete d.examples;
    }
  }

  const { readdirSync, statSync } = await import("node:fs");
  const walk = (d) =>
    readdirSync(d).flatMap((f) => {
      const p = join(d, f);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
  for (let round = 0; round < 4; round++) {
    let added = 0;
    for (const file of walk(join(app, "src")).filter((f) => /\.(t|j)sx?$/.test(f))) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/from\s+["']@\/(components\/ui|hooks)\/([\w-]+)["']/g)) {
        const base = join(app, "src", m[1], m[2]);
        if (![".tsx", ".ts", ".jsx", ".js"].some((e) => existsSync(base + e))) {
          await add("shadcn", m[2], lib);
          added++;
        }
      }
      for (const m of text.matchAll(/from\s+["']@\/([\w./-]+)["']/g)) {
        const rel = m[1];
        const base = join(app, "src", rel);
        if ([".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts"].some((e) => existsSync(base + e))) continue;
        const roots = DOCS[lib];
        found: for (const root of roots)
          for (const ext of [".tsx", ".ts", "/index.tsx", "/index.ts"]) {
            const r = await fetch(`${RAW}/${root}/${rel}${ext}`);
            if (r.ok) {
              mkdirSync(dirname(base + ext), { recursive: true });
              writeFileSync(base + ext, await r.text());
              added++;
              break found;
            }
          }
      }
      for (const m of text.matchAll(/from\s+["']((?:@[\w.-]+\/)?[\w.-]+)(?:\/[^"']*)?["']/g)) {
        const pkg = m[1];
        if (!/^(react|react-dom|cn|next)$/.test(pkg) && !pkg.startsWith(".")) deps.add(pkg);
      }
    }
    if (!added) break;
  }

  let src = `export const demos: Record<string, () => Promise<any>> = {\n`;
  const entry = (key, file) =>
    `  ${JSON.stringify(key)}: () => import(${JSON.stringify("@/" + file.replace(/\.(t|j)sx?$/, ""))}),\n`;
  for (const d of demos) if (d.demo) src += entry(d.name, d.file);
  for (const d of demos) for (const [e, file] of Object.entries(d.examples ?? {})) src += entry(`${d.name}~${e}`, file);
  src += "};\n";
  src += `export const props: Record<string, any> = ${JSON.stringify(Object.fromEntries(demos.filter((d) => d.demo && Object.keys(d.props).length).map((d) => [d.name, d.props])), null, 1)};\n`;
  writeFileSync(join(app, "src/demos.tsx"), src);

  const assets = new Set();
  const scan = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const f = join(dir, e.name);
      if (e.isDirectory()) scan(f);
      else if (/\.(t|j)sx?$/.test(e.name))
        for (const m of readFileSync(f, "utf8").matchAll(
          /["'`](\/[\w./-]+\.(?:png|jpe?g|webp|gif|svg|avif|mp4|webm))["'`]/g,
        ))
          assets.add(m[1]);
    }
  };
  scan(join(app, "src"));
  for (const a of assets) {
    const out = join(app, "public", a);
    if (existsSync(out)) continue;
    const r = await fetch(`${RAW}/${DOCS[lib][0]}/public${a}`);
    if (!r.ok) {
      missing.push("asset " + a);
      continue;
    }
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
  console.log(
    `${lib}: ${demos.filter((d) => d.demo).length}/${names.length} demos, ${deps.size} npm deps, missing: ${missing.join(", ") || "none"}`,
  );
}

if (process.argv[2]) {
  const [lib, app] = process.argv.slice(2);
  const cat = JSON.parse(readFileSync(new URL("../lib/catalog/data.json", import.meta.url), "utf8"));
  const names = cat.components.filter((c) => c.library === lib).map((c) => c.name);
  await install(lib, app, names);
}
