import type { Metadata } from "next";

export const SITE_URL = "https://quire.fyi";
export const SITE_NAME = "quire";
export const TAGLINE = "Keep every component you find. Hand them to your agent.";
export const DESCRIPTION =
  "A gallery for UI components. Save any component or library by link, watch it run, and hand it to your AI agent with its install command and source.";

export const OG_IMAGE = { url: "/og.png", width: 1200, height: 630, alt: `quire: ${TAGLINE}` };

export function social(path: string, title: string, description: string): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      type: "website",
      url: path,
      siteName: SITE_NAME,
      locale: "en_US",
      title,
      description,
      images: [OG_IMAGE],
    },
    twitter: { card: "summary_large_image", creator: "@rickmff", title, description, images: [OG_IMAGE] },
  };
}

export const DEFAULT_TITLE = "quire · UI component gallery for your AI agent";
