"use client";

import type { RefObject } from "react";
import { PlusIcon as Plus, SearchIcon } from "lucide-react";
import { DialogTrigger } from "@ui-sdk/react/dialog";
import SocialLinks from "@/components/SocialLinks";
import { Tip } from "@/components/ui/tooltip";
import { commandDialog } from "@/components/app/agent";
import type { BarMode } from "@/components/app/useShortcuts";
import { USER_ADDS } from "@/lib/features";
import { normalizeUrl } from "@/lib/store";

const ALL_MODES = [
  ["search", "Search this view", "/", SearchIcon],
  ["add", "Add a component or library", "+", Plus],
] as const;
const MODES = ALL_MODES.filter(([m]) => USER_ADDS || m === "search");

export function TopBar({
  input,
  setInput,
  mode,
  setMode,
  inputRef,
  viewName,
  onAdd,
  onImport,
}: {
  input: string;
  setInput: (value: string) => void;
  mode: BarMode;
  setMode: (mode: BarMode) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  viewName: string;
  onAdd: (url: string) => void;
  onImport: (url: string) => void;
}) {
  return (
    <header
      data-chrome
      style={{ "--d": "60ms" } as React.CSSProperties}
      className="sticky top-0 z-10 -mx-4 bg-bg/90 px-4 backdrop-blur-md md:mr-0 md:ml-0 md:px-0"
    >
      <form
        className="flex h-14 items-center gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!USER_ADDS) return;
          if (mode === "search" && !normalizeUrl(input)) return;
          onAdd(input);
          setInput("");
        }}
      >
        <div className="flex h-9 w-full items-center gap-2 rounded-lg bg-field pr-2 pl-1 transition-colors focus-within:bg-field-focus">
          {MODES.length === 1 && (
            <span className="grid size-8 shrink-0 place-items-center text-faint">
              <SearchIcon className="size-3.5" strokeWidth={1.75} aria-hidden />
            </span>
          )}
          <div
            role="radiogroup"
            aria-label="What the bar does"
            hidden={MODES.length === 1}
            className="flex shrink-0 items-center gap-px rounded-md p-0.5 [&[hidden]]:hidden"
          >
            {MODES.map(([m, label, key, Icon]) => (
              <Tip key={m} label={label} shortcut={key}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  aria-label={label}
                  onClick={() => {
                    setMode(m);
                    inputRef.current?.focus();
                  }}
                  className={`grid size-7 place-items-center rounded-[5px] transition-[background-color,color,box-shadow] ${
                    mode === m ? "bg-panel text-fg shadow-sm ring-1 ring-line" : "text-faint hover:text-muted"
                  }`}
                >
                  <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
                </button>
              </Tip>
            ))}
          </div>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && input) {
                e.preventDefault();
                e.stopPropagation();
                setInput("");
              }
            }}
            placeholder={mode === "search" ? `Search ${viewName}` : "Paste a component or library link"}
            className="h-full w-full bg-transparent pl-1 outline-none placeholder:text-faint"
            aria-label={mode === "search" ? "Search components" : "Component or library link"}
            autoComplete="off"
            spellCheck={false}
          />
          {USER_ADDS && input.trim() && (mode === "add" || normalizeUrl(input)) && (
            <>
              <Tip label="Add this link as a component">
                <button
                  type="submit"
                  className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] whitespace-nowrap text-muted transition hover:text-fg"
                >
                  Add component <span className="text-faint">↵</span>
                </button>
              </Tip>
              <Tip label="Find every component in this library and sort them by type">
                <button
                  type="button"
                  onClick={() => {
                    onImport(input);
                    setInput("");
                  }}
                  className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] whitespace-nowrap text-muted transition hover:text-fg"
                >
                  Import library
                </button>
              </Tip>
            </>
          )}
          {mode === "search" && input && !(USER_ADDS && normalizeUrl(input)) && (
            <button
              type="button"
              onClick={() => {
                setInput("");
                inputRef.current?.focus();
              }}
              className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] text-faint transition hover:text-muted"
              aria-label="Clear search"
            >
              Clear
            </button>
          )}
          <DialogTrigger
            controller={commandDialog}
            className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] text-faint transition hover:text-muted"
            aria-keyshortcuts="Meta+K Control+K"
          >
            <span aria-hidden="true">⌘K</span>
            <span className="sr-only">Open command menu</span>
          </DialogTrigger>
        </div>
        <SocialLinks className="hidden md:flex" />
      </form>
    </header>
  );
}
