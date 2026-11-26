import { FeatureCard, FeatureSearch } from "@/components/prestigeui/feature-card";

export default function FeatureCardDemo() {
  return (
    <div className="w-full max-w-md">
      <FeatureCard
        title="Find anything"
        description="Search across projects, people and files, and jump straight to the result."
        illustration={<FeatureSearch />}
        href="#"
        tone="sky"
      />
    </div>
  );
}
