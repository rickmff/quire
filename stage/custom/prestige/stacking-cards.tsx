import { StackingCards } from "@/components/prestigeui/stacking-cards";

const photo = (a: string, b: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="800" height="1000" fill="url(#g)"/><circle cx="560" cy="300" r="180" fill="#fff" fill-opacity=".18"/><circle cx="260" cy="720" r="260" fill="#000" fill-opacity=".12"/></svg>`,
  )}`;

const items = [
  {
    label: "01",
    tag: "Plan",
    title: "Shape the work",
    description: "Turn ideas into scoped projects with owners and dates.",
    image: { src: photo("#0ea5e9", "#6366f1"), alt: "Planning" },
    meta: [{ label: "Teams", value: "12" }],
  },
  {
    label: "02",
    tag: "Build",
    title: "Ship in small steps",
    description: "Branch, review and release without losing the thread.",
    image: { src: photo("#f97316", "#db2777"), alt: "Building" },
    meta: [{ label: "Releases", value: "48" }],
  },
  {
    label: "03",
    tag: "Learn",
    title: "Measure what changed",
    description: "See the effect of each release on the numbers you care about.",
    image: { src: photo("#22c55e", "#0d9488"), alt: "Learning" },
    meta: [{ label: "Metrics", value: "9" }],
  },
];

export default function StackingCardsDemo() {
  return (
    <div className="w-full max-w-3xl">
      <StackingCards items={items} top={24} smooth={false} />
    </div>
  );
}
