import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Cloudflare adds its managed content-signal block above this on quire.fyi.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/add"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
