import { capture, captureEnabled } from "@/lib/capture";
import { safeUrl } from "@/lib/net";
import { clientAddress, rateLimited } from "@/lib/rateLimit";
import { isCrossSite, logSuspicious } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!captureEnabled()) return Response.json({ error: "off" }, { status: 404 });
  if (isCrossSite(req)) {
    logSuspicious({ reason: "cross-site", route: "capture", client: clientAddress(req) });
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const limited = await rateLimited(req, "capture");
  if (limited) return limited;
  const { url } = await req.json().catch(() => ({}));
  const u = typeof url === "string" ? await safeUrl(url) : null;
  if (!u) return Response.json({ error: "bad-url" }, { status: 400 });
  const out = await capture(u.href);
  return out ? Response.json(out) : Response.json({ error: "failed" }, { status: 502 });
}
