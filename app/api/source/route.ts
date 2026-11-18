import { catalog } from "@/lib/catalog";
import { readSource } from "@/lib/source";
import { rateLimited } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const limited = await rateLimited(req, "fetch");
  if (limited) return limited;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const c = catalog.components.find((x) => x.id === id);
  if (!c) return Response.json({ error: "not-found" }, { status: 404 });
  const src = await readSource(c);
  if (!src) return Response.json({ error: "unavailable", docs: c.docs }, { status: 404 });
  return Response.json(src, { headers: { "cache-control": "public, max-age=3600" } });
}
