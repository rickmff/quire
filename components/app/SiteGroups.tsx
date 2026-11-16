"use client";

import { useEffect, useMemo, useState } from "react";
import { type GalleryItem } from "@/lib/useCatalog";
import { groupItems } from "@/lib/groups";

export function Collapse({
  open,
  className = "grid",
  children,
}: {
  open: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      inert={!open}
      className={`${className} transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="flex min-h-0 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
export function SiteGroups({
  items,
  openItem,
  openId,
  active,
  onGroup,
}: {
  items: GalleryItem[];
  openItem: (item: GalleryItem) => void;
  openId?: string;
  active: string | null;
  onGroup: (key: string | null) => void;
}) {
  const groups = useMemo(() => groupItems(items), [items]);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    const g = groups.find((g) => g.items.some((i) => i.id === openId));
    if (g) setOpen(g.key);
  }, [groups, openId]);
  useEffect(() => {
    if (active) setOpen(active);
  }, [active]);
  const toggle = (k: string) => {
    const off = active === k;
    setOpen(off ? null : k);
    onGroup(off ? null : k);
  };

  return (
    <div className="contents">
      {groups.map((g) => {
        const expanded = open === g.key;
        return (
          <div key={g.key} className="contents">
            <button
              data-row
              aria-expanded={expanded}
              aria-pressed={active === g.key}
              onClick={() => toggle(g.key)}
              className={`group flex h-6 shrink-0 items-center gap-2 pl-3 text-left text-[12px] whitespace-nowrap transition ${
                active === g.key ? "text-accent" : "text-muted hover:text-fg"
              }`}
            >
              <span className="flex w-[26px] shrink-0 items-center pl-[13px]">
                <svg
                  viewBox="0 0 8 8"
                  className={`size-2 transition-transform duration-200 motion-reduce:transition-none ${expanded ? "rotate-90" : ""}`}
                  aria-hidden
                >
                  <path
                    d="M2.5 1.5 5.5 4l-3 2.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="min-w-0 flex-1 truncate">{g.name}</span>
              <span className="text-[11px] tabular-nums">{g.items.length}</span>
            </button>
            <Collapse open={expanded}>
              {g.items.map((i) => (
                <button
                  key={i.id}
                  data-row
                  aria-current={openId === i.id ? "page" : undefined}
                  onClick={() => openItem(i)}
                  className="group flex h-7 shrink-0 items-center gap-2 rounded-md pr-2 pl-6 text-left text-[13px] whitespace-nowrap text-fg transition hover:bg-hover aria-[current=page]:hover:bg-transparent"
                >
                  <span className="w-[26px] shrink-0">
                    <span data-tick className={`block h-px ${openId === i.id ? "" : "bg-faint group-hover:bg-fg"}`} />
                  </span>
                  <span data-label className="min-w-0 flex-1 truncate first-letter:uppercase">
                    {i.title}
                  </span>
                </button>
              ))}
            </Collapse>
          </div>
        );
      })}
    </div>
  );
}
