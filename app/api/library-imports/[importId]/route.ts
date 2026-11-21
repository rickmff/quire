import { isAdmin, readImport } from "@/lib/imports";
import { rateLimited } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ importId: string }> };

export async function GET(req: Request, { params }: Params) {
  const limited = await rateLimited(req, "read");
  if (limited) return limited;
  if (!isAdmin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const { importId } = await params;
  if (!/^[a-f0-9]{16}$/.test(importId)) return Response.json({ error: "bad-id" }, { status: 400 });
  const status = await readImport(importId);
  return status ? Response.json(status) : Response.json({ error: "not-found" }, { status: 404 });
}
