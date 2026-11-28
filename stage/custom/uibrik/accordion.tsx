import { Accordion } from "@/@components/uibrik/accordion/accordion";

const items = [
  {
    title: "How long is the free trial?",
    content:
      "Fourteen days with every feature included. No card needed to start, and nothing is charged unless you choose a plan.",
  },
  {
    title: "Can I change plans later?",
    content:
      "Yes, at any time. Upgrades apply straight away; downgrades take effect at the end of the current billing period.",
  },
  {
    title: "Do you offer refunds?",
    content: "If something is not right in the first 30 days, write to us and we refund the full amount.",
  },
  {
    title: "Is my data safe?",
    content: "Everything is encrypted in transit and at rest, and you can export or delete it whenever you like.",
  },
];

export default function AccordionDemo() {
  return (
    <div className="w-full max-w-md">
      <Accordion items={items} defaultOpen={[0]} />
    </div>
  );
}
