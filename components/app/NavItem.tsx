"use client";

import { Tip } from "@/components/ui/tooltip";
import { useState } from "react";
import { PAGES, type View } from "@/lib/view";
import { TrashIcon } from "@/components/app/icons";

export function NavItem({
  id,
  name,
  count,
  view,
  setView,
  moveTo,
  onRename,
  onDelete,
}: {
  id: View;
  name: string;
  count: number;
  view: View;
  setView: (v: View) => void;
  moveTo: (bookmarkId: string, target: View) => void;
  onRename?: () => void;
  onDelete?: () => void;
}) {
  const [over, setOver] = useState(false);
  const active = view === id;
  const droppable = !(typeof id === "string" && (PAGES.has(id) || id.startsWith("site:")));
  const deselect = active && typeof id === "string" && id.startsWith("site:");
  return (
    <Tip label={onRename ? "Double-click to rename" : undefined} side="right">
      <button
        onClick={() => setView(deselect ? "libraries" : id)}
        onDoubleClick={onRename}
        onDragOver={(e) => {
          if (!droppable) return;
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          setOver(false);
          const bid = e.dataTransfer.getData("text/bookmark-id");
          if (bid && droppable) moveTo(bid, id);
        }}
        data-row
        aria-current={active ? "page" : undefined}
        className={`group flex h-7 shrink-0 items-center gap-2 rounded-md px-2 text-left whitespace-nowrap transition md:rounded-none md:px-0 ${
          active ? "bg-hover text-fg md:bg-transparent" : "text-muted hover:text-fg"
        } ${over ? "bg-hover text-fg" : ""}`}
      >
        <span className="hidden w-[26px] shrink-0 md:block">
          <span data-tick className={`block h-px ${active ? "" : "bg-faint group-hover:bg-muted"}`} />
        </span>
        <span data-label className="min-w-0 flex-1 truncate">
          {name}
        </span>
        <span
          className={`text-[11px] tabular-nums text-faint transition ${active ? "" : "opacity-0 group-hover:opacity-100"}`}
        >
          {count || ""}
        </span>
        {onDelete && (
          <Tip label="Remove collection">
            <span
              role="button"
              tabIndex={0}
              aria-label={`Remove collection “${name}”`}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              onDoubleClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                e.stopPropagation();
                onDelete();
              }}
              className="-my-1 grid size-5 shrink-0 place-items-center rounded text-faint opacity-0 transition hover:bg-hover hover:text-fg focus-visible:opacity-100 group-hover:opacity-100"
            >
              <TrashIcon />
            </span>
          </Tip>
        )}
      </button>
    </Tip>
  );
}
