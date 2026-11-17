"use client";

export const svg = {
  width: 14,
  height: 14,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
export function CopyIcon() {
  return (
    <svg {...svg} aria-hidden>
      <rect x="5.5" y="5.5" width="7.5" height="7.5" rx="1.5" />
      <path d="M10.5 3.5v-.25A1.25 1.25 0 0 0 9.25 2h-5A1.25 1.25 0 0 0 3 3.25v5A1.25 1.25 0 0 0 4.25 9.5h.25" />
    </svg>
  );
}
export function NoteIcon() {
  return (
    <svg {...svg} aria-hidden>
      <path d="M10.5 2.75 13.25 5.5 6 12.75H3.25V10z" />
    </svg>
  );
}
export function FolderIcon() {
  return (
    <svg {...svg} aria-hidden>
      <path d="M2.5 4.75c0-.7.55-1.25 1.25-1.25h2.6l1.4 1.5h4.5c.7 0 1.25.55 1.25 1.25v5c0 .7-.55 1.25-1.25 1.25h-8.5c-.7 0-1.25-.55-1.25-1.25z" />
    </svg>
  );
}
export function TagIcon() {
  return (
    <svg {...svg} aria-hidden>
      <path d="M2.75 8.25V3.5c0-.4.35-.75.75-.75h4.75l5 5-5.5 5.5z" />
      <circle cx="5.5" cy="5.5" r=".9" />
    </svg>
  );
}
export function TrashIcon() {
  return (
    <svg {...svg} aria-hidden>
      <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.5 8.5h6l.5-8.5" />
    </svg>
  );
}
