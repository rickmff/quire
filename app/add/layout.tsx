import type { Metadata } from "next";

// The extension's save page: useful only with a ?url=, so keep it out of search.
export const metadata: Metadata = {
  title: "Save to library",
  robots: { index: false, follow: false },
};

export default function AddLayout({ children }: { children: React.ReactNode }) {
  return children;
}
