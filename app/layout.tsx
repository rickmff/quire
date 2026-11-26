import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DEFAULT_TITLE, DESCRIPTION, SITE_NAME, SITE_URL, social } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: DEFAULT_TITLE, template: `%s · ${SITE_NAME}` },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Henrique Matos", url: "https://github.com/rickmff" }],
  creator: "Henrique Matos",
  ...social("/", DEFAULT_TITLE, DESCRIPTION),
};

export const viewport: Viewport = {
  themeColor: "#0b0b0b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistMono.variable}>
      <body className="font-sans min-h-dvh">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <TooltipProvider>{children}</TooltipProvider>
        <Analytics />
        <SpeedInsights />
        <Script src="/drop-sw.js" strategy="beforeInteractive" />
      </body>
    </html>
  );
}
