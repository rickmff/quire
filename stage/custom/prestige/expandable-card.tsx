import { ExpandableCard } from "@/components/prestigeui/expandable-card";

export default function ExpandableCardDemo() {
  return (
    <div className="w-80">
      <ExpandableCard
        eyebrow="Case study"
        title="Halving onboarding time"
        meta={["Fintech", "8 weeks"]}
        summary="How a smaller first screen and one honest checklist doubled activation."
        sections={[
          { title: "The problem", body: "New users stalled on a long form before they saw any value." },
          {
            title: "What we changed",
            items: ["Asked for two fields, not nine", "Showed a sample workspace", "Moved billing to day seven"],
          },
        ]}
        action={{ label: "Read the full story", href: "#" }}
      />
    </div>
  );
}
