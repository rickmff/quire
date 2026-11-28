import { TechStack } from "@/@components/uibrik/tech-stack/tech-stack";

const items = [
  { brand: "react" as const },
  { brand: "nextjs" as const },
  { brand: "typescript" as const },
  { brand: "tailwind" as const },
  { brand: "vercel" as const },
  { brand: "supabase" as const },
  { brand: "stripe" as const },
];

export default function TechStackDemo() {
  return <TechStack items={items} />;
}
