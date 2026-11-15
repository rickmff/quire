import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "quire",
  description: "Bookmark UI components from every library. Organize them. Hand them to your AI agent.",
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
      <body className="font-sans min-h-dvh">{children}</body>
    </html>
  );
}
