import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import ts from "typescript";

const SKIP = [
  /^public\/stage\//,
  /^public\/previews\//,
  /(^|\/)package-lock\.json$/,
];

const ALLOWED = [
  /@ts-(expect-error|ignore|nocheck|check)\b/,
  /\beslint-(disable|enable)/,
  /\bbiome-ignore\b/,
  /\bprettier-ignore\b/,
  /@jsx(ImportSource|Runtime|Frag)?\b/,
  /^\/\/\/\s*<reference\b/,
  /#__(PURE|NO_SIDE_EFFECTS)__/,
  /\bwebpack[A-Z]\w*\s*:/,
  /@vite-ignore\b/,
  /@(license|preserve)\b/,
  /^\/\*!/,
  /\bSPDX-License-Identifier\b/,
  /\bCopyright\b/,
];

const isAllowed = (text) => ALLOWED.some((re) => re.test(text));

function scriptKind(file) {
  if (file.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (file.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (/\.(js|mjs|cjs)$/.test(file)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function scriptComments(file, text) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKind(file));
  const seen = new Map();
  const collect = (ranges) => {
    for (const r of ranges ?? []) seen.set(r.pos, text.slice(r.pos, r.end));
  };
  const visit = (node) => {
    if (node.kind === ts.SyntaxKind.JsxText) return;
    if (node.kind !== ts.SyntaxKind.SourceFile) {
      collect(ts.getLeadingCommentRanges(text, node.pos));
      collect(ts.getTrailingCommentRanges(text, node.end));
    }
    for (const child of node.getChildren(source)) visit(child);
  };
  visit(source);
  return [...seen].map(([pos, body]) => ({ pos, body }));
}

function blockComments(text, { line = false } = {}) {
  const found = [];
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      const stop = end === -1 ? text.length : end + 2;
      found.push({ pos: i, body: text.slice(i, stop) });
      i = stop - 1;
    } else if (line && c === "/" && text[i + 1] === "/") {
      const end = text.indexOf("\n", i);
      const stop = end === -1 ? text.length : end;
      found.push({ pos: i, body: text.slice(i, stop) });
      i = stop - 1;
    }
  }
  return found;
}

function markupComments(text) {
  const found = [];
  const re = /<!--[\s\S]*?-->/g;
  for (let m; (m = re.exec(text)); ) found.push({ pos: m.index, body: m[0] });
  return found;
}

function hashComments(text) {
  const found = [];
  let pos = 0;
  for (const raw of text.split("\n")) {
    const trimmed = raw.trimStart();
    const isShebang = pos === 0 && trimmed.startsWith("#!");
    if (trimmed.startsWith("#") && !isShebang) found.push({ pos: pos + raw.length - trimmed.length, body: trimmed });
    pos += raw.length + 1;
  }
  return found;
}

function commentsIn(file, text) {
  if (/\.(ts|tsx|js|jsx|mjs|cjs|mts|cts)$/.test(file)) return scriptComments(file, text);
  if (file.endsWith(".css")) return blockComments(text);
  if (file.endsWith(".jsonc")) return blockComments(text, { line: true });
  if (file.endsWith(".html")) return markupComments(text);
  if (/\.(sh|py|ya?ml)$/.test(file) || /(^|\/)(Dockerfile|Caddyfile)$/.test(file)) return hashComments(text);
  return [];
}

function lineOf(text, pos) {
  let line = 1;
  for (let i = 0; i < pos; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
  .split("\n")
  .filter((f) => f && !SKIP.some((re) => re.test(f)));

const problems = [];
for (const file of files) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const { pos, body } of commentsIn(file, text)) {
    if (isAllowed(body)) continue;
    const preview = body.split("\n")[0].slice(0, 80);
    problems.push(`${file}:${lineOf(text, pos)}  ${preview}`);
  }
}

if (problems.length) {
  console.error(problems.join("\n"));
  console.error(`\n${problems.length} comment(s) found. This repo does not use code comments; see AGENTS.md.`);
  process.exit(1);
}
console.log("No comments found.");
