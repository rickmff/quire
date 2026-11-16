import { handleRpc } from "@/lib/mcp";
import { loadLibrary } from "@/lib/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 256 * 1024;
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, accept, mcp-session-id, mcp-protocol-version, x-quire-key, authorization",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...CORS } });

function keyFrom(req: Request) {
  const u = new URL(req.url);
  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  return u.searchParams.get("key") ?? req.headers.get("x-quire-key") ?? bearer ?? null;
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > MAX_BODY) return json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Body too large" } }, 413);
  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
  }
  const key = keyFrom(req);
  const user = key ? await loadLibrary(key).catch(() => null) : null;
  const ctx = { user, base: new URL(req.url).origin };
  const batch = Array.isArray(body) ? body : [body];
  const out = (await Promise.all(batch.map((m) => handleRpc(m, ctx)))).filter(Boolean);
  if (!out.length) return new Response(null, { status: 202, headers: CORS });
  return json(Array.isArray(body) ? out : out[0]);
}

export async function GET() {
  return new Response("Quire MCP: POST JSON-RPC here.", { status: 405, headers: { allow: "POST", ...CORS } });
}

export async function DELETE() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
