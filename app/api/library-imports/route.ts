import { randomUUID } from "node:crypto";
import { start } from "workflow/api";
import { isAdmin, parseRequest, writeImport } from "@/lib/imports";
import { kv } from "@/lib/kv";
import { clientAddress, rateLimited } from "@/lib/rateLimit";
import { logSuspicious } from "@/lib/security";
import { importLibrary } from "@/workflows/import-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = await rateLimited(req, "write");
  if (limited) return limited;
  if (!isAdmin(req)) {
    logSuspicious({ reason: "not-admin", route: "library-imports", client: clientAddress(req) });
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  if (!kv()) return Response.json({ error: "no-store" }, { status: 503 });
  const request = parseRequest(await req.json().catch(() => null));
  if (!request) return Response.json({ error: "bad-request" }, { status: 400 });
  const importId = randomUUID().replace(/-/g, "").slice(0, 16);
  const repo = process.env.QUIRE_GITHUB_REPO ?? "rickmff/quire";
  const revision = process.env.VERCEL_GIT_COMMIT_SHA ?? "main";
  await writeImport(importId, { phase: "queued", request });
  const run = await start(importLibrary, [importId, request, repo, revision]);
  await writeImport(importId, { workflowRunId: run.runId });
  return Response.json({ importId, status: `/api/library-imports/${importId}` }, { status: 202 });
}
