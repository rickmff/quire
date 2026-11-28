import { IconCopy } from "@tabler/icons-react";
import { Tooltip } from "@/@components/uibrik/tooltip/tooltip";

export default function TooltipDemo() {
  return (
    <Tooltip content="Copy link" shortcut="⌘C">
      <button
        type="button"
        aria-label="Copy"
        className="grid size-10 place-items-center rounded-xl border bg-background"
      >
        <IconCopy size={18} />
      </button>
    </Tooltip>
  );
}
