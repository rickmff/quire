import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const CACHE = join(fileURLToPath(new URL("../..", import.meta.url)), ".cache/catalog");

export function git(args: string[], cwd?: string) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

export type Checkout = { files: string[]; show: (path: string) => string };

export function checkout(repo: string, branch = "HEAD"): Checkout {
  const dir = join(CACHE, repo.replace("/", "__"));
  if (!existsSync(dir)) {
    mkdirSync(CACHE, { recursive: true });
    git(["clone", "-q", "--depth", "1", "--filter=blob:none", "--no-checkout", `https://github.com/${repo}`, dir]);
  }
  const files = git(["ls-tree", "-r", "--name-only", branch], dir).split("\n").filter(Boolean);
  const show = (path: string) => git(["show", `${branch}:${path}`], dir);
  return { files, show };
}
