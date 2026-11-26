import type { Metadata } from "next";
import { social } from "@/lib/seo";
import { appDescription } from "@/lib/pages";

const TITLE = "Component gallery";
const DESC = appDescription();

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/app" },
  ...social("/app", `${TITLE} · quire`, DESC),
};

export default function Page() {
  return null;
}
