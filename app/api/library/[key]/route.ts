import { cleanLibrary, KEY_RE, loadLibrary, saveLibrary } from "@/lib/sync";
import { kv } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ key: string }> };

export async function GET(_: Request, { params }: Params) {
  const { key } = await params;
  if (!KEY_RE.test(key)) return Response.json({ error: "bad-key" }, { status: 400 });
  if (!kv()) return Response.json({ error: "no-store" }, { status: 503 });
  const lib = await loadLibrary(key);
  return lib ? Response.json(lib) : Response.json({ error: "not-found" }, { status: 404 });
}

export async function PUT(req: Request, { params }: Params) {
  const { key } = await params;
  if (!KEY_RE.test(key)) return Response.json({ error: "bad-key" }, { status: 400 });
  if (!kv()) return Response.json({ error: "no-store" }, { status: 503 });
  const raw = await req.text();
  if (raw.length > 3_000_000) return Response.json({ error: "too-large" }, { status: 413 });
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return Response.json({ error: "bad-json" }, { status: 400 });
  }
  const lib = cleanLibrary(input);
  if (!lib) return Response.json({ error: "bad-library" }, { status: 400 });
  try {
    await saveLibrary(key, lib);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
  return Response.json({ ok: true, items: lib.items.length, sources: lib.sources.length, updatedAt: lib.updatedAt });
}
