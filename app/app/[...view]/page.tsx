import type { Metadata } from "next";
import { galleryPages, pageAt, type GalleryPage } from "@/lib/pages";
import { SITE_URL, social } from "@/lib/seo";
import { libraryName } from "@/lib/catalog";
import { metadata as appMetadata } from "../page";

type Props = { params: Promise<{ view: string[] }> };

const pathOf = (view: string[]) => ["/app", ...view.map(encodeURIComponent)].join("/");

export function generateStaticParams() {
  return [
    ...galleryPages().map((p) => ({ view: p.path.split("/").slice(2).map(decodeURIComponent) })),
    { view: ["sites"] },
    { view: ["agents"] },
  ];
}

const OWN: Record<string, { title: string; description: string }> = {
  "/app/sites": {
    title: "Sites",
    description: "The curated component libraries in Quire. Keep the ones you want, and your AI agent only sees those.",
  },
  "/app/agents": {
    title: "Agents",
    description: "Connect Quire to your AI agent over MCP, or install the Quire skill, and hand it real components.",
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const path = pathOf((await params).view);
  const page = pageAt(path) ?? (OWN[path] ? { path, ...OWN[path] } : null);
  if (!page)
    return { title: appMetadata.title, description: appMetadata.description, robots: { index: false, follow: true } };
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: page.path },
    ...social(page.path, `${page.title} · quire`, page.description),
  };
}

function jsonLd(page: GalleryPage) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE_URL}${page.path}`,
    url: `${SITE_URL}${page.path}`,
    name: page.title,
    description: page.description,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: page.items.length,
      itemListElement: page.items.slice(0, 60).map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "SoftwareSourceCode",
          name: c.title,
          ...(c.description ? { description: c.description } : {}),
          url: c.docs,
          ...(c.repo ? { codeRepository: `https://github.com/${c.repo}` } : {}),
          programmingLanguage: "TypeScript",
          publisher: { "@type": "Organization", name: libraryName(c) },
        },
      })),
    },
  };
}

export default async function Page({ params }: Props) {
  const page = pageAt(pathOf((await params).view));
  if (!page) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(page)).replace(/</g, "\\u003c") }}
    />
  );
}
