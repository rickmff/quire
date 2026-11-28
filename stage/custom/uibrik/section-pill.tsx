import { SectionPill } from "@/@components/uibrik/section-pill/section-pill";

const sections = [
  { id: "intro", title: "Introduction" },
  { id: "setup", title: "Setup" },
  { id: "usage", title: "Usage" },
  { id: "faq", title: "FAQ" },
];

export default function SectionPillDemo() {
  return <SectionPill sections={sections} />;
}
