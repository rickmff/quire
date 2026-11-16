import { capture, captureEnabled } from "@/lib/capture";
import { safeUrl } from "@/lib/net";
import { rateLimited } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!captureEnabled()) return Response.json({ error: "off" }, { status: 404 });
  const limited = rateLimited(req, "capture");
  if (limited) return limited;
  const { url } = await req.json().catch(() => ({}));
  const u = typeof url === "string" ? await safeUrl(url) : null;
  if (!u) return Response.json({ error: "bad-url" }, { status: 400 });
  const out = await capture(u.href);
  return out ? Response.json(out) : Response.json({ error: "failed" }, { status: 502 });
}
