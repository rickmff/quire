import { kv } from "@/lib/kv";
import { captureEnabled } from "@/lib/capture";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ sync: Boolean(kv()), capture: captureEnabled() });
}
