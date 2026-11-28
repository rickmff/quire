import { Popover } from "@/@components/uibrik/popover/popover";

export default function PopoverDemo() {
  return (
    <Popover content={<p className="text-sm">Share this page with your team.</p>} label="Share">
      <button type="button" className="h-10 rounded-xl border bg-background px-4 text-sm font-medium">
        Share
      </button>
    </Popover>
  );
}
