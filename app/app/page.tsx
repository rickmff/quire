import type { Metadata } from "next";
import { social } from "@/lib/seo";

const TITLE = "Component gallery";
const DESC =
  "Browse animated UI components from Magic UI and Animate UI with live previews, star the ones you keep, and copy them for your AI agent or fetch them over MCP.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/app" },
  ...social("/app", `${TITLE} · quire`, DESC),
};

// The gallery itself lives in ./layout.tsx, so it stays mounted while the
// address moves between views (/app/all-libraries, …). Every view shares this
// page's metadata and canonical: they are views of one app, not pages of their own.
export default function Page() {
  return null;
}
