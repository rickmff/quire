import { autoTags, matchLibrary, titleFromUrl } from "@/lib/libraries";
import { fetchText, safeUrl } from "@/lib/net";
import { USER_ADDS } from "@/lib/features";
import { rateLimited } from "@/lib/rateLimit";

const MAX_HTML_BYTES = 400_000;

function httpUrl(raw: string, base: string) {
  try {
    const u = new URL(raw, base);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : undefined;
  } catch {
    return undefined;
  }
}

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
  if (!USER_ADDS) return Response.json({ error: "off" }, { status: 404 });
  const limited = rateLimited(req, "fetch");
  if (limited) return limited;
  const raw = new URL(req.url).searchParams.get("url") ?? "";
  const u = await safeUrl(raw);
  if (!u) return Response.json({ error: "invalid url" }, { status: 400 });

  const lib = matchLibrary(u.href);
  let title: string | undefined;
  let description: string | undefined;
  let image: string | undefined;

  const page = await fetchText(u.href, { accept: "text/html", max: MAX_HTML_BYTES, timeout: 6000 });
  if (page?.type.includes("text/html")) {
    const html = page.text;
    title =
      pick(html, "og:title", "twitter:title") ?? decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "");
    description = pick(html, "og:description", "twitter:description", "description");
    const img = pick(html, "og:image", "og:image:url", "twitter:image", "twitter:image:src");
    image = img ? httpUrl(img, page.url) : undefined;
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
