import { ScrollFill } from "@/components/prestigeui/scroll-fill";

export default function ScrollFillDemo() {
  return (
    <ScrollFill
      start={1}
      end={0}
      text="We build tools for teams who care about the details. Every word fills in as you read, so the page keeps pace with you."
      className="max-w-2xl text-3xl font-medium leading-snug tracking-tight"
    />
  );
}
