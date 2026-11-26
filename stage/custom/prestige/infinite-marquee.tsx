import { InfiniteMarquee } from "@/components/prestigeui/infinite-marquee";

const items = ["Linear", "Vercel", "Figma", "Notion", "Stripe", "Raycast", "Arc", "Framer"];

export default function InfiniteMarqueeDemo() {
  return (
    <div className="w-full max-w-3xl">
      <InfiniteMarquee duration={20}>
        {items.map((item) => (
          <span key={item} className="rounded-full border px-5 py-2 text-lg font-medium text-muted-foreground">
            {item}
          </span>
        ))}
      </InfiniteMarquee>
    </div>
  );
}
