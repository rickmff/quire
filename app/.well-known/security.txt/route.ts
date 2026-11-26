import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

const YEAR = 365 * 24 * 60 * 60 * 1000;

export function GET() {
  const expires = new Date(Date.now() + YEAR).toISOString();
  const body = [
    "Contact: https://github.com/rickmff/quire/security/advisories/new",
    `Expires: ${expires}`,
    "Preferred-Languages: en, pt",
    `Canonical: ${SITE_URL}/.well-known/security.txt`,
    "Policy: https://github.com/rickmff/quire/blob/main/SECURITY.md",
    "",
  ].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
