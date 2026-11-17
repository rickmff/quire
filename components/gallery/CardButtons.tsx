"use client";

import { Tip } from "@/components/ui/tooltip";
import { Maximize2 } from "lucide-react";

export function OpenDetails({ onClick }: { onClick: () => void }) {
  return (
    <Tip label="Open details">
      <button
        type="button"
        data-open
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Open details"
        className="absolute right-2 bottom-2 z-10 flex size-7 items-center justify-center rounded-md bg-bg/80 text-muted opacity-0 shadow-sm ring-1 ring-line backdrop-blur-sm transition group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-bg hover:text-fg focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <Maximize2 size={14} strokeWidth={1.75} aria-hidden />
      </button>
    </Tip>
  );
}
export function AgentButton({ onClick }: { onClick: () => void }) {
  return (
    <Tip label="Copy an agent-ready description">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="btn btn-secondary btn-sm -my-[3px] -mr-0.5 shrink-0 !h-[22px] !px-2 text-[11px]"
      >
        Copy for agent
      </button>
    </Tip>
  );
}
