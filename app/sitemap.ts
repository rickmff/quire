import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { catalog } from "@/lib/catalog";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(catalog.generatedAt);
  return [
    { url: SITE_URL, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/app`, lastModified, changeFrequency: "weekly", priority: 0.8 },
  ];
}
