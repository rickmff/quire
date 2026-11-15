// The library ships no demo for Slot (a utility that merges motion props into its child).
// This one passes hover and tap animations into a plain button.
import { Slot } from "@/components/animate-ui/primitives/animate/slot";

export default function SlotDemo() {
  return (
    <Slot whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
      <button className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm">
        Button with motion props from Slot
      </button>
    </Slot>
  );
}
