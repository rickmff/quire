import "server-only";
import { USER_ADDS } from "@/lib/features";

export const captureEnabled = () =>
  USER_ADDS && Boolean(process.env.QUIRE_CAPTURE_URL && process.env.QUIRE_CAPTURE_TOKEN);

export async function capture(url: string, video = true): Promise<{ image?: string; video?: string } | null> {
  if (!captureEnabled()) return null;
  try {
    const r = await fetch(`${process.env.QUIRE_CAPTURE_URL!.replace(/\/$/, "")}/capture`, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.QUIRE_CAPTURE_TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({ url, video }),
      signal: AbortSignal.timeout(60_000),
    });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}
