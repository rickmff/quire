import "server-only";
import { timingSafeEqual } from "node:crypto";
import { kv } from "./kv";

export type ImportPhase =
  "queued" | "setup" | "discover" | "stage" | "record" | "publish" | "deliver" | "done" | "refused" | "failed";

export type ImportRequest = { url: string; repo?: string; id?: string; name?: string; docs?: string };

export type ImportStatus = {
  importId: string;
  request: ImportRequest;
  phase: ImportPhase;
  detail?: string;
  library?: string;
  progress?: { done: number; total: number };
  pr?: string;
  workflowRunId?: string;
  summary?: string;
  startedAt: string;
  updatedAt: string;
};

const key = (importId: string) => `import:${importId}`;

export async function readImport(importId: string): Promise<ImportStatus | null> {
  const value = await kv()?.get(key(importId));
  return value ? (JSON.parse(value) as ImportStatus) : null;
}

export async function writeImport(
  importId: string,
  change: Partial<ImportStatus> & { request?: ImportRequest },
): Promise<ImportStatus> {
  const store = kv();
  const now = new Date().toISOString();
  const prev = await readImport(importId);
  const next: ImportStatus = {
    importId,
    phase: "queued",
    startedAt: now,
    request: { url: "" },
    ...prev,
    ...change,
    updatedAt: now,
  };
  await store?.put(key(importId), JSON.stringify(next));
  return next;
}

export function isAdmin(req: Request, token = process.env.QUIRE_ADMIN_TOKEN) {
  if (!token || token.length < 32) return false;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function parseRequest(body: unknown): ImportRequest | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const text = (v: unknown, max = 300) => (typeof v === "string" && v.trim() && v.length <= max ? v.trim() : undefined);
  const url = text(b.url);
  if (!url || !/^(https:\/\/[\w.-]+(\/[\w./~%-]*)?|@[\w.-]+)$/.test(url)) return null;
  const repo = text(b.repo, 120);
  if (repo && !/^[\w.-]+\/[\w.-]+$/.test(repo)) return null;
  const id = text(b.id, 60);
  if (id && !/^[a-z0-9][a-z0-9-]*$/.test(id)) return null;
  const docs = text(b.docs);
  if (docs && !/^https:\/\/[\w.-]+\/[\w./~%-]*\{name\}[\w./~%-]*$/.test(docs)) return null;
  return { url, repo, id, name: text(b.name, 60), docs };
}

export function batches<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function changedFiles(porcelain: string) {
  return porcelain
    .split("\n")
    .filter(Boolean)
    .map((line) => ({ status: line.slice(0, 2).trim(), path: line.slice(3).replace(/^"|"$/g, "") }))
    .filter((f) => f.path && !f.path.endsWith("/"));
}
