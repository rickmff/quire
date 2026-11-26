import { RotatingWords } from "@/components/prestigeui/rotating-words";

export default function RotatingWordsDemo() {
  return (
    <h2 className="text-4xl font-semibold tracking-tight">
      Build for <RotatingWords words={["designers", "developers", "founders", "teams"]} interval={1600} />
    </h2>
  );
}
