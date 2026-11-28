import { Marquee } from "@/@components/uibrik/marquee/marquee";

const names = ["Acme", "Globex", "Initech", "Umbrella", "Hooli", "Stark", "Wayne", "Soylent"];

export default function MarqueeDemo() {
  return (
    <div className="w-[640px] max-w-full">
      <Marquee>
        {names.map((n) => (
          <span key={n} className="text-2xl font-semibold tracking-tight text-muted-foreground">
            {n}
          </span>
        ))}
      </Marquee>
    </div>
  );
}
