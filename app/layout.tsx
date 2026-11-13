import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "quire",
  description: "Bookmark UI components from every library. Organize them. Hand them to your AI agent.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistMono.variable}>
      <body className="font-sans min-h-dvh">{children}</body>
    </html>
  );
}
