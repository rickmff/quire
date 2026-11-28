import { IconHome } from "@tabler/icons-react";
import { CollapsingBreadcrumb } from "@/@components/uibrik/collapsing-breadcrumb/collapsing-breadcrumb";

const items = [
  { label: "Home", href: "#", icon: <IconHome stroke={1.75} /> },
  { label: "Acme Inc", href: "#" },
  { label: "Projects", href: "#" },
  { label: "Website", href: "#" },
  { label: "Design", href: "#" },
  { label: "Landing page", href: "#" },
];

export default function CollapsingBreadcrumbDemo() {
  return <CollapsingBreadcrumb items={items} />;
}
