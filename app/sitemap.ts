import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { catalog } from "@/lib/catalog";
import { galleryPages } from "@/lib/pages";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(catalog.generatedAt);
  return [
    { url: SITE_URL, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/app`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    ...galleryPages().map((p) => ({
      url: `${SITE_URL}${p.path}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: p.path.split("/").length > 4 ? 0.5 : 0.7,
    })),
    { url: `${SITE_URL}/app/sites`, lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/app/agents`, lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/llms.txt`, lastModified, changeFrequency: "weekly", priority: 0.3 },
  ];
}
