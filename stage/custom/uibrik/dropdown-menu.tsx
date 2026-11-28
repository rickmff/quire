import { IconCopy, IconEdit, IconTrash } from "@tabler/icons-react";
import { DropdownMenu } from "@/@components/uibrik/dropdown-menu/dropdown-menu";

const items = [
  { label: "Rename", icon: <IconEdit size={16} />, shortcut: "↵" },
  { label: "Duplicate", icon: <IconCopy size={16} />, shortcut: "⌘D" },
  { type: "sub" as const, label: "Move to", items: [{ label: "Archive" }, { label: "Drafts" }] },
  { type: "separator" as const },
  { label: "Delete", icon: <IconTrash size={16} />, danger: true },
];

export default function DropdownMenuDemo() {
  return (
    <DropdownMenu items={items}>
      <button type="button" className="h-10 rounded-xl border bg-background px-4 text-sm font-medium">
        Options
      </button>
    </DropdownMenu>
  );
}
