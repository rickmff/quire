import { kv } from "@/lib/kv";
import { captureEnabled } from "@/lib/capture";

export const dynamic = "force-dynamic";

// Tells the app whether libraries can sync to the server (and so reach the MCP).
export async function GET() {
  return Response.json({ sync: Boolean(kv()), capture: captureEnabled() });
}
