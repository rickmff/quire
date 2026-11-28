import { IconPlus } from "@tabler/icons-react";
import { ExpandButton } from "@/@components/uibrik/expand-button/expand-button";

export default function ExpandButtonDemo() {
  return <ExpandButton icon={<IconPlus size={20} />} label="New file" />;
}
