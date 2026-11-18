import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { USER_ADDS } from "@/lib/features";

export const metadata: Metadata = {
  title: "Save to library",
  robots: { index: false, follow: false },
};

export default function AddLayout({ children }: { children: React.ReactNode }) {
  if (!USER_ADDS) notFound();
  return children;
}
