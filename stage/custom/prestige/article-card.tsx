import { ArticleCard } from "@/components/prestigeui/article-card";

const photo = (a: string, b: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="800" height="1000" fill="url(#g)"/><circle cx="560" cy="300" r="180" fill="#fff" fill-opacity=".18"/><circle cx="260" cy="720" r="260" fill="#000" fill-opacity=".12"/></svg>`,
  )}`;

export default function ArticleCardDemo() {
  return (
    <div className="w-full max-w-2xl">
      <ArticleCard
        href="#"
        title="How we rebuilt our design system in six weeks"
        excerpt="A short story about tokens, naming and the one spreadsheet that kept the team honest."
        image={{ src: photo("#6366f1", "#06b6d4"), alt: "Abstract cover" }}
        category="Engineering"
        readingTime="6 min read"
        author={{ name: "Jonas Weber" }}
        date="Nov 12, 2026"
        dateTime="2026-11-12"
      />
    </div>
  );
}
