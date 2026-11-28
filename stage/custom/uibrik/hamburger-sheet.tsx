import {
  IconBellFilled,
  IconHomeFilled,
  IconMailFilled,
  IconSettingsFilled,
  IconUserFilled,
} from "@tabler/icons-react";
import { HamburgerSheet } from "@/@components/uibrik/hamburger-sheet/hamburger-sheet";

const items = [
  { label: "Home", icon: <IconHomeFilled size={16} /> },
  { label: "Inbox", icon: <IconMailFilled size={16} />, hint: "12" },
  { label: "Alerts", icon: <IconBellFilled size={16} /> },
  { label: "Profile", icon: <IconUserFilled size={16} /> },
  { label: "Settings", icon: <IconSettingsFilled size={16} /> },
];

export default function HamburgerSheetDemo() {
  return <HamburgerSheet items={items} label="Menu" />;
}
