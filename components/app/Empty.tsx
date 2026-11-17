"use client";

const EXAMPLES = [
  "magicui.design/docs/components/marquee",
  "ui.aceternity.com/components/3d-card-effect",
  "ui.shadcn.com/docs/components/command",
];
export function Empty({ onAdd }: { onAdd: (url: string) => void }) {
  return (
    <div className="mx-auto max-w-sm pt-24 text-center">
      <p className="text-fg">Paste a component link.</p>
      <p className="mt-1 text-muted">From any library. Press ⌘V anywhere.</p>
      <div className="mt-8 flex flex-col items-center gap-1">
        {EXAMPLES.map((u) => (
          <button
            key={u}
            onClick={() => onAdd(u)}
            className="rounded-md px-2 py-1 font-mono text-[11px] text-faint transition hover:bg-hover hover:text-muted"
          >
            {u}
          </button>
        ))}
      </div>
    </div>
  );
}
