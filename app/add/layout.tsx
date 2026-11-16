import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Save to library",
  robots: { index: false, follow: false },
};

export default function AddLayout({ children }: { children: React.ReactNode }) {
  return children;
}
