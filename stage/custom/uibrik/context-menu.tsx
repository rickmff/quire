import { IconCopy, IconEdit, IconTrash } from "@tabler/icons-react";
import { ContextMenu } from "@/@components/uibrik/context-menu/context-menu";

const items = [
  { label: "Rename", icon: <IconEdit size={16} />, shortcut: "↵" },
  { label: "Duplicate", icon: <IconCopy size={16} />, shortcut: "⌘D" },
  { type: "sub" as const, label: "Move to", items: [{ label: "Archive" }, { label: "Drafts" }] },
  { type: "separator" as const },
  { label: "Delete", icon: <IconTrash size={16} />, danger: true },
];

export default function ContextMenuDemo() {
  return (
    <ContextMenu items={items}>
      <div className="grid h-40 w-72 place-items-center rounded-2xl border border-dashed text-sm text-muted-foreground">
        Right-click here
      </div>
    </ContextMenu>
  );
}
