import { HoverCard } from "@/@components/uibrik/hover-card/hover-card";

const content = (
  <div className="flex flex-col gap-3">
    <span className="grid size-11 place-items-center rounded-full bg-foreground text-base font-medium text-background">
      A
    </span>
    <div>
      <p className="text-sm font-medium text-foreground">Ada Lovelace</p>
      <p className="text-sm text-muted-foreground">@ada</p>
    </div>
    <p className="text-sm leading-6 text-foreground">Writing notes on the Analytical Engine. Poetical science.</p>
  </div>
);

export default function HoverCardDemo() {
  return (
    <p className="text-sm text-muted-foreground">
      Notes by{" "}
      <HoverCard content={content}>
        <a href="#" className="font-medium text-foreground underline underline-offset-4">
          @ada
        </a>
      </HoverCard>
    </p>
  );
}
