import { autoTags, matchLibrary, titleFromUrl } from "@/lib/libraries";
import { safeUrl } from "@/lib/net";

export const runtime = "nodejs";

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
        "user-agent": "Mozilla/5.0 (compatible; QuireBot/0.1; +https://github.com)",
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
