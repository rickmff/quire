import { parseClientError } from "@/lib/clientError";
import { rateLimited } from "@/lib/rateLimit";
import { isCrossSite } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (isCrossSite(req)) return new Response(null, { status: 403 });
  const limited = await rateLimited(req, "write");
  if (limited) return limited;
  const error = parseClientError(await req.text());
  if (!error) return new Response(null, { status: 400 });
  console.error(JSON.stringify({ level: "error", kind: "client-error", at: new Date().toISOString(), ...error }));
  return new Response(null, { status: 204 });
}
