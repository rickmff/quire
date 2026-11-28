import { OnThisPage } from "@/@components/uibrik/on-this-page/on-this-page";

const sections = [
  { id: "overview", title: "Overview" },
  {
    id: "install",
    title: "Installation",
    children: [
      { id: "requirements", title: "Requirements" },
      { id: "manual-setup", title: "Manual setup" },
    ],
  },
  { id: "usage", title: "Usage" },
  { id: "api", title: "API reference" },
];

export default function OnThisPageDemo() {
  return <OnThisPage sections={sections} />;
}
