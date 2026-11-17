"use client";

export function ConfirmRemove({
  name,
  count,
  onCancel,
  onConfirm,
}: {
  name: string;
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/30 p-4 pt-[20vh]"
      onMouseDown={onCancel}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-remove-title"
        aria-describedby="confirm-remove-desc"
        onMouseDown={(e) => e.stopPropagation()}
        className="pop w-full max-w-sm rounded-xl border border-line bg-panel p-4 shadow-[0_16px_48px_-12px_rgb(0_0_0/0.25)]"
      >
        <p id="confirm-remove-title" className="text-fg">
          Remove “{name}”?
        </p>
        <p id="confirm-remove-desc" className="mt-1 text-muted">
          {count
            ? `Its ${count} component${count === 1 ? "" : "s"} stay saved, with no collection.`
            : "The collection is empty."}
        </p>
        <div className="mt-4 flex justify-end gap-1.5">
          <button onClick={onCancel} className="btn btn-sm btn-secondary">
            Cancel
          </button>
          <button autoFocus onClick={onConfirm} className="btn btn-sm btn-primary">
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
