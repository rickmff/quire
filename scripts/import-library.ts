import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Catalog } from "../lib/catalog/schema.ts";
import { checkout } from "./catalog/git.ts";
import type { Imported } from "./catalog/sources.ts";
import {
  COMPONENT_TYPES,
  type DirectoryEntry,
  demoStyle,
  docsLayout,
  libraryName,
  findInDirectory,
  firstSentence,
  pickRegistry,
  repoFromHtml,
  slug,
} from "./import/discover.ts";
import { judgeLicense, licenseFiles } from "./import/license.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const STAGE = join(ROOT, "stage");
const IMPORTED = join(ROOT, "scripts/catalog/imported.json");
const LIBS = join(STAGE, "libs.json");
const DATA = join(ROOT, "lib/catalog/data.json");
const SHOTS = join(ROOT, "lib/catalog/stage.json");
const DIRECTORY = "https://raw.githubusercontent.com/shadcn-ui/ui/HEAD/apps/v4/registry/directory.json";
const STEPS = ["discover", "catalog", "stage", "record", "publish", "summary"] as const;
type Step = (typeof STEPS)[number];

const argv = process.argv.slice(2);
const arg = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const input = argv.find((a, i) => !a.startsWith("--") && !argv[i - 1]?.startsWith("--"));
const from = (arg("from") ?? "discover") as Step;
const until = (arg("until") ?? "summary") as Step;
for (const [flag, value] of [
  ["from", from],
  ["until", until],
] as const)
  if (!STEPS.includes(value)) {
    console.error(`--${flag} "${value}" is not a step. Steps: ${STEPS.join(", ")}`);
    process.exit(1);
  }
if (STEPS.indexOf(from) > STEPS.indexOf(until)) {
  console.error(`--from ${from} comes after --until ${until}.`);
  process.exit(1);
}
const runs = (s: Step) => STEPS.indexOf(s) >= STEPS.indexOf(from) && STEPS.indexOf(s) <= STEPS.indexOf(until);

if (!input && !arg("repo") && !arg("id")) {
  console.log(`Usage: npm run import -- <site url | @scope> [--repo owner/name] [--id id] [--name "Name"]
  [--blurb "One line."] [--docs "https://site/docs/{name}"] [--from step] [--until step] [--port 5190]
  [--only name,name] records only those components
Steps: ${STEPS.join(", ")}`);
  process.exit(1);
}

const readJson = <T>(file: string, empty: T): T => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : empty);
const writeJson = (file: string, value: unknown) => {
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
  spawnSync("npx", ["prettier", "--write", file], { cwd: ROOT, stdio: "ignore" });
};
class Stop extends Error {}
const fail = (message: string): never => {
  throw new Stop(message);
};
const log = (step: string, message: string) => console.log(`[${step}] ${message}`);

async function fetchText(url: string) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
    return r.ok ? await r.text() : undefined;
  } catch {
    return undefined;
  }
}

async function discover() {
  const directory: DirectoryEntry[] = JSON.parse((await fetchText(DIRECTORY)) ?? "[]");
  const listed = input ? findInDirectory(directory, input) : undefined;
  const homepage = listed?.homepage ?? (input && /^https?:/.test(input) ? input : undefined);
  log("discover", listed ? `listed in the shadcn directory as ${listed.name}` : "not in the shadcn directory");

  let repo = arg("repo");
  if (!repo && homepage) {
    const html = await fetchText(homepage);
    if (!html) fail(`could not load ${homepage}. Check the URL, or pass --repo owner/name.`);
    repo = repoFromHtml(html!);
    if (!repo) fail(`${homepage} links to no GitHub repository. Pass --repo owner/name.`);
  }
  if (!repo) fail("no site and no repository. Pass a site URL or --repo owner/name.");
  log("discover", `repository ${repo}`);

  const { files, show } = checkout(repo!);
  const read = (p: string) => {
    try {
      return show(p);
    } catch {
      return undefined;
    }
  };

  const licenseFile = licenseFiles(files)[0];
  let declared: string | undefined;
  try {
    declared = JSON.parse(read("package.json") ?? "{}").license;
  } catch {}
  const license = judgeLicense(licenseFile && read(licenseFile), licenseFile, declared);
  if (!license.ok) fail(`license refused: ${license.reason}.`);
  log("discover", `license ${license.ok && license.spdx} (${licenseFile})`);

  const registry = pickRegistry(files, (p) => read(p) ?? "");
  if (!registry) fail("no shadcn registry.json that lists components in the repository.");
  log(
    "discover",
    `registry ${registry!.path}: ${registry!.count} components, ${registry!.built ? "built items" : "source only"}`,
  );

  const scope = listed?.name.replace(/^@/, "");
  const id = arg("id") ?? slug(scope ?? repo!.split("/")[1]);
  const site = (homepage ?? `https://github.com/${repo}`).replace(/\/$/, "");
  const names = registry!.items.filter((i) => COMPONENT_TYPES.has(i.type ?? "")).map((i) => i.name);
  const docs = arg("docs") ? { template: arg("docs")!, guessed: false } : docsLayout(files, site, names);
  if (docs.guessed) log("discover", `docs URL guessed as ${docs.template}; pass --docs to fix it`);
  const style = demoStyle(registry!.items);

  const entry: Imported = {
    id,
    name: arg("name") ?? libraryName(read(registry!.path)) ?? id,
    url: site,
    blurb: arg("blurb") ?? (firstSentence(listed?.description) || `Components from ${repo}.`),
    repo: repo!,
    path: registry!.path,
    docs: docs.template,
    ...("pages" in docs && docs.pages ? { docsPages: docs.pages } : {}),
    item: listed?.url,
    scope,
    license: license.ok ? license.spdx : "",
  };
  const imported = readJson<Imported[]>(IMPORTED, []).filter((i) => i.id !== id);
  writeJson(IMPORTED, [...imported, entry]);

  const libs = readJson<Record<string, unknown>>(LIBS, {});
  libs[id] = {
    repo: repo!,
    dir: registry!.dir,
    roots: [registry!.root],
    demos: style,
    keepPaths: true,
    examples: style === "suffix",
  };
  writeJson(LIBS, libs);
  log("discover", `wrote ${id} to scripts/catalog/imported.json and stage/libs.json`);
  mkdirSync(join(STAGE, "out"), { recursive: true });
  writeFileSync(
    join(STAGE, "out", "discover.json"),
    JSON.stringify({ ...entry, components: registry!.count, docsGuessed: docs.guessed }, null, 1),
  );
  return id;
}

function run(step: string, cmd: string, args: string[], cwd = ROOT, env: NodeJS.ProcessEnv = {}) {
  log(step, [cmd, ...args].join(" "));
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", env: { ...process.env, ...env } });
  if (r.status !== 0) fail(`${step} failed (${cmd} exited with ${r.status}).`);
}

async function waitFor(url: string, ms = 120000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fetchText(url)) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  fail(`the stage server did not answer at ${url}.`);
}

function stopTree(pid?: number) {
  if (!pid) return;
  try {
    if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
    else process.kill(-pid, "SIGTERM");
  } catch {}
}

async function record(id: string) {
  const port = arg("port") ?? "5190";
  if (await fetchText(`http://localhost:${port}/`))
    fail(`port ${port} is already in use, maybe by a stage server left from an earlier run. Stop it or pass --port.`);
  const app = join(STAGE, `app-${id}`);
  log("record", `starting the stage on port ${port}`);
  const server = spawn("npx", ["vite", "--logLevel", "warn"], {
    cwd: app,
    env: { ...process.env, PORT: port },
    stdio: "inherit",
    detached: process.platform !== "win32",
    shell: process.platform === "win32",
  });
  try {
    await waitFor(`http://localhost:${port}/`);
    const only = arg("only")?.split(",").filter(Boolean) ?? [];
    run("record", "node", ["capture.mjs", id, port, `out/${id}`, ...only], STAGE);
    run("record", "node", ["video.mjs", id, port, `out/${id}`, ...only], STAGE);
  } finally {
    stopTree(server.pid);
  }
}

type Report = Record<string, { error?: string; errs?: string[]; skip?: string }>;

function summary(id: string) {
  const data = readJson<Catalog>(DATA, { version: 1, generatedAt: "", libraries: [], components: [] });
  const shots = readJson<Record<string, { image?: string; video?: string; live?: unknown }>>(SHOTS, {});
  const out = join(STAGE, "out", id);
  const report = readJson<Report>(join(out, "report.json"), {});
  const video = readJson<Report>(join(out, "video.json"), {});
  const demos = readJson<{ name: string; demo: string | null }[]>(join(STAGE, `app-${id}`, "demos.json"), []);
  const components = data.components.filter((c) => c.library === id);
  const rows = components.map((c) => {
    const s = shots[c.id];
    const problems = [
      !demos.find((d) => d.name === c.name)?.demo && "no demo",
      ...["light", "dark"].flatMap((t) => [report[`${c.name}|${t}`]?.error, ...(report[`${c.name}|${t}`]?.errs ?? [])]),
      ...["light", "dark"].map((t) => video[`${c.name}|${t}`]?.error),
    ].filter((p): p is string => Boolean(p));
    return {
      id: c.id,
      title: c.title,
      image: Boolean(s?.image),
      video: Boolean(s?.video),
      live: Boolean(s?.live),
      problems: [...new Set(problems)],
    };
  });
  const review = rows.filter((r) => !r.image || r.problems.length);
  const result = {
    library: id,
    components: rows.length,
    withImage: rows.filter((r) => r.image).length,
    withVideo: rows.filter((r) => r.video).length,
    withLive: rows.filter((r) => r.live).length,
    review,
  };
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "summary.json"), JSON.stringify(result, null, 1));
  const md = [
    `# ${id}`,
    "",
    `- ${result.components} components`,
    `- ${result.withImage} with light and dark images`,
    `- ${result.withVideo} with clips`,
    `- ${result.withLive} with a live demo`,
    "",
    review.length ? "## To review" : "Nothing to review.",
    "",
    ...review.map((r) => `- \`${r.id}\`: ${r.image ? "" : "no preview. "}${r.problems.join("; ")}`),
    "",
  ].join("\n");
  writeFileSync(join(out, "summary.md"), md);
  console.log("\n" + md);
  log("summary", `wrote stage/out/${id}/summary.md`);
}

async function main() {
  let id = arg("id") ?? "";
  if (runs("discover")) id = await discover();
  if (!id) fail("pass --id when starting after the discover step.");
  if (runs("catalog")) run("catalog", "node", ["scripts/build-catalog.ts", id]);
  if (runs("stage")) {
    run("stage", "sh", ["setup.sh", id], STAGE);
    run("stage", "bash", ["build.sh", "..", id], STAGE);
  }
  if (runs("record")) await record(id);
  if (runs("publish")) run("publish", "node", ["publish.mjs", "..", id], STAGE);
  if (runs("summary")) summary(id);
}

try {
  await main();
} catch (e) {
  if (!(e instanceof Stop)) throw e;
  console.error(`\nStopped: ${e.message}`);
  process.exitCode = 2;
}
