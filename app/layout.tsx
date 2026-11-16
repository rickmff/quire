import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

const DESCRIPTION = "Keep every component you find. Hand them to your agent.";
// public/og.png is a static asset, served by the Workers assets binding.
const OG_IMAGE = { url: "/og.png", width: 1200, height: 630, alt: "quire: Keep every component you find. Hand them to your agent." };

export const metadata: Metadata = {
  metadataBase: new URL("https://quire.fyi"),
  title: "quire",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    url: "/",
    siteName: "quire",
    title: "quire",
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "quire",
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

// Runs from the server-rendered HTML, before any script bundle. A service worker
// left on this origin by another app (localhost:3000 is shared by many projects)
// can serve stale scripts, which then break hydration. Quire registers none:
// remove any that is there and reload once, so fresh scripts load.
const DROP_SW = `(function(){try{var s=navigator.serviceWorker;if(!s)return;s.getRegistrations().then(function(r){if(!r.length)return;Promise.all(r.map(function(x){return x.unregister()})).then(function(){if(window.caches)caches.keys().then(function(k){return Promise.all(k.map(function(n){return caches.delete(n)}))}).finally(function(){if(!sessionStorage.getItem("quire-sw")){sessionStorage.setItem("quire-sw","1");location.reload()}});else location.reload()})})}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistMono.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: DROP_SW }} />
      </head>
      <body className="font-sans min-h-dvh">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
