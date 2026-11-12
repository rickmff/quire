import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { autoTags, matchLibrary, titleFromUrl } from "@/lib/libraries";

export const runtime = "nodejs";

function isPrivate(ip: string) {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    return v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:127.");
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 || a === 127 || a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

async function safeUrl(raw: string): Promise<URL | null> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (u.hostname === "localhost") return null;
  // Local sandboxes without DNS can opt out; never set this in production.
  if (process.env.DESIGNLIB_SKIP_DNS_CHECK === "1") return u;
  try {
    const addrs = isIP(u.hostname)
      ? [{ address: u.hostname }]
      : await lookup(u.hostname, { all: true });
    if (addrs.some((a) => isPrivate(a.address))) return null;
  } catch {
    return null;
  }
  return u;
}

function pick(html: string, ...keys: string[]) {
  for (const k of keys) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${k}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${k}["']`,
      "i",
    );
    const m = html.match(re);
    const v = m?.[1] ?? m?.[2];
    if (v) return decode(v.trim());
  }
  return undefined;
}

function decode(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("url") ?? "";
  const u = await safeUrl(raw);
  if (!u) return Response.json({ error: "invalid url" }, { status: 400 });

  const lib = matchLibrary(u.href);
  let title: string | undefined;
  let description: string | undefined;
  let image: string | undefined;

  try {
    const res = await fetch(u.href, {
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; DesignLibBot/0.1; +https://github.com)",
        accept: "text/html",
      },
    });
    const type = res.headers.get("content-type") ?? "";
    if (res.ok && type.includes("text/html")) {
      const html = (await res.text()).slice(0, 400_000);
      title =
        pick(html, "og:title", "twitter:title") ??
        decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "");
      description = pick(html, "og:description", "twitter:description", "description");
      const img = pick(html, "og:image", "og:image:url", "twitter:image", "twitter:image:src");
      if (img) {
        try {
          image = new URL(img, res.url).href;
        } catch {}
      }
    }
  } catch {
    // Network errors fall through to a URL-only card.
  }

  if (!title) title = titleFromUrl(u.href);

  return Response.json(
    {
      url: u.href,
      title: title.slice(0, 160),
      description: description?.slice(0, 300),
      image,
      library: lib.library,
      install: lib.install,
      tags: autoTags(title, u.pathname),
    },
    { headers: { "cache-control": "public, s-maxage=86400" } },
  );
}
