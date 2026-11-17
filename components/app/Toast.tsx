"use client";

import type { ToastMessage } from "@/components/app/useToast";

export function Toast({ toast }: { toast: ToastMessage | null }) {
  if (!toast) return null;
  return (
    <div
      role="status"
      className="pop fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-line bg-panel px-3.5 py-1.5 text-muted shadow-[0_6px_20px_-8px_rgb(0_0_0/0.2)]"
    >
      {toast.msg}
      {toast.undo && (
        <button onClick={toast.undo} className="text-fg transition hover:opacity-70">
          Undo
        </button>
      )}
    </div>
  );
}
