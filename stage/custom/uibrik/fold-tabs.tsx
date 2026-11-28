import { FoldTabs } from "@/@components/uibrik/fold-tabs/fold-tabs";

const items = [
  {
    value: "overview",
    label: "Overview",
    content:
      "A lightweight shell in recycled nylon that packs into its own pocket. Wind and light rain stay out; heat doesn't stay in.",
  },
  {
    value: "specs",
    label: "Specs",
    content: (
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
        <dt>Weight</dt>
        <dd className="text-foreground">212 g</dd>
        <dt>Shell</dt>
        <dd className="text-foreground">Recycled nylon, 20D</dd>
      </dl>
    ),
  },
  { value: "care", label: "Care", content: "Machine wash cold, hang to dry. Re-proof once a season." },
  { value: "returns", label: "Returns", content: "Free returns for 60 days, worn or not." },
];

export default function FoldTabsDemo() {
  return (
    <div className="w-full max-w-lg">
      <FoldTabs items={items} />
    </div>
  );
}
