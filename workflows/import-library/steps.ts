import { put } from "@vercel/blob";
import { Sandbox } from "@vercel/sandbox";
import { FatalError } from "workflow";
import { githubFromEnv } from "@/lib/github";
import { batches, changedFiles, writeImport, type ImportRequest, type ImportStatus } from "@/lib/imports";

export type Box = { name: string; root: string; logs: string };
export type PhaseResult = { done: boolean; code?: number; log?: string; elapsed: number };
export type Outputs = {
  parent: string;
  files: { status: string; path: string }[];
  previews: string[];
  summary: string;
};

const MINUTE = 60_000;
const PHASE_LIMIT = 44 * MINUTE;
const shell = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

const sandbox = (name: string) => Sandbox.get({ name });

async function read(box: Box, path: string) {
  const buf = await (await sandbox(box.name)).readFileToBuffer({ path: `${box.root}/${path}` });
  return buf ?? undefined;
}

async function exec(box: Box, script: string) {
  const r = await (await sandbox(box.name)).runCommand({ cmd: "bash", args: ["-lc", script], cwd: box.root });
  const out = await r.stdout();
  if (r.exitCode !== 0) throw new Error(`command failed (${r.exitCode}): ${(await r.stderr()).slice(-500)}`);
  return out;
}

export async function setStatus(importId: string, change: Partial<ImportStatus>) {
  "use step";
  await writeImport(importId, change);
}

export async function createSandbox(importId: string): Promise<Box> {
  "use step";
  const name = `quire-import-${importId}`;
  const box = await Sandbox.getOrCreate({
    name,
    resources: { vcpus: 4 },
    timeout: 45 * MINUTE,
    tags: { app: "quire", job: "import" },
  });
  const home = (await (await box.runCommand({ cmd: "bash", args: ["-lc", "echo $HOME"] })).stdout()).trim();
  return { name, root: `${home}/quire`, logs: `${home}/import-logs` };
}

export async function removeSandbox(box: Box) {
  "use step";
  try {
    await (await sandbox(box.name)).delete();
  } catch {}
}

export async function stopSandbox(box: Box) {
  "use step";
  await (await sandbox(box.name)).stop();
}

export async function startPhase(box: Box, phase: string, script: string, cwd = box.root) {
  "use step";
  const s = await sandbox(box.name);
  const dir = box.logs;
  const started = await s.readFileToBuffer({ path: `${dir}/${phase}.log` });
  if (started) return;
  await s.runCommand({ cmd: "mkdir", args: ["-p", dir, cwd] });
  await s.runCommand({
    cmd: "bash",
    args: ["-lc", `(${script}) > ${dir}/${phase}.log 2>&1; echo $? > ${dir}/${phase}.exit`],
    cwd,
    detached: true,
  });
  await s.writeFiles([{ path: `${dir}/${phase}.start`, content: String(Date.now()) }]);
}

export async function pollPhase(box: Box, phase: string): Promise<PhaseResult> {
  "use step";
  const s = await sandbox(box.name);
  const dir = box.logs;
  const since = Number((await s.readFileToBuffer({ path: `${dir}/${phase}.start` }))?.toString() ?? Date.now());
  const elapsed = Date.now() - since;
  const exit = await s.readFileToBuffer({ path: `${dir}/${phase}.exit` });
  const log = (await s.readFileToBuffer({ path: `${dir}/${phase}.log` }))?.toString().slice(-3000);
  if (exit) return { done: true, code: Number(exit.toString().trim()), log, elapsed };
  if (elapsed > PHASE_LIMIT) return { done: true, code: 124, log: `${log ?? ""}\nstopped after 44 minutes`, elapsed };
  return { done: false, elapsed };
}

export function setupScript(repo: string, revision: string) {
  return [
    "set -e",
    `if [ ! -d quire/.git ]; then git init -q quire && cd quire && git remote add origin https://github.com/${repo}.git && git fetch -q --depth 1 origin ${shell(revision)} && git checkout -q FETCH_HEAD; else cd quire; fi`,
    "command -v ffmpeg >/dev/null || (sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg)",
    "npm ci --no-audit --no-fund",
    "cd stage && npm install --no-audit --no-fund",
    "npx playwright install chromium",
    'sudo env "PATH=$PATH" npx playwright install-deps chromium',
  ].join("\n");
}

export function importArgs(request: ImportRequest) {
  const args = [request.url];
  if (request.repo) args.push("--repo", request.repo);
  if (request.id) args.push("--id", request.id);
  if (request.name) args.push("--name", request.name);
  if (request.docs) args.push("--docs", request.docs);
  return args.map(shell).join(" ");
}

export const importScript = (args: string) => `node scripts/import-library.ts ${args}`;

export async function readDiscovery(box: Box) {
  "use step";
  const text = await read(box, "stage/out/discover.json");
  if (!text) throw new FatalError("discover wrote no result");
  return JSON.parse(text.toString()) as { id: string; name: string; license: string; components: number };
}

export async function demoNames(box: Box, id: string) {
  "use step";
  const text = await read(box, `stage/app-${id}/demos.json`);
  const demos = text ? (JSON.parse(text.toString()) as { name: string; demo: string | null }[]) : [];
  return demos.filter((d) => d.demo).map((d) => d.name);
}

export async function collectOutputs(box: Box, id: string): Promise<Outputs> {
  "use step";
  const parent = (await exec(box, "git rev-parse HEAD")).trim();
  const files = changedFiles(await exec(box, "git status --porcelain --untracked-files=all"));
  const previews = (await exec(box, `find public/previews/${id} -type f 2>/dev/null || true`))
    .split("\n")
    .filter(Boolean);
  const summary = (await read(box, `stage/out/${id}/summary.md`))?.toString() ?? "";
  return { parent, files, previews, summary };
}

export async function uploadPreviews(box: Box, paths: string[]) {
  "use step";
  for (const path of paths) {
    const content = await read(box, path);
    if (!content) continue;
    await put(path.replace(/^public\//, ""), content, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 86_400,
    });
  }
  return paths.length;
}

export async function pushBlobs(box: Box, files: { status: string; path: string }[]) {
  "use step";
  const gh = githubFromEnv();
  if (!gh) throw new FatalError("QUIRE_GITHUB_TOKEN is not set");
  const out: { path: string; sha: string | null }[] = [];
  for (const f of files) {
    if (f.status === "D") {
      out.push({ path: f.path, sha: null });
      continue;
    }
    const content = await read(box, f.path);
    if (content) out.push({ path: f.path, sha: await gh.blob(content) });
  }
  return out;
}

export async function openPullRequest(p: {
  importId: string;
  id: string;
  name: string;
  license: string;
  url: string;
  parent: string;
  summary: string;
  entries: { path: string; sha: string | null }[];
}) {
  "use step";
  const gh = githubFromEnv();
  if (!gh) throw new FatalError("QUIRE_GITHUB_TOKEN is not set");
  return gh.openPullRequest({
    parent: p.parent,
    base: process.env.QUIRE_GITHUB_BASE ?? "main",
    branch: `import/${p.id}-${p.importId.slice(0, 8)}`,
    title: `Import ${p.name}`,
    body: [
      `Imported by the Quire import agent from ${p.url}.`,
      "",
      `- License: ${p.license}`,
      "- Previews are already in Vercel Blob, so the preview deployment shows them.",
      "- Review the cards in the preview deployment before merging.",
      "",
      p.summary,
    ].join("\n"),
    entries: p.entries,
  });
}

export { batches };
