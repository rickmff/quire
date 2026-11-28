import { TickNav } from "@/@components/uibrik/tick-nav/tick-nav";

const items = ["Overview", "Components", "Animations", "Backgrounds", "Showcase", "Playground", "Templates"];

export default function TickNavDemo() {
  return <TickNav items={items} defaultValue={3} label="Sections" />;
}
