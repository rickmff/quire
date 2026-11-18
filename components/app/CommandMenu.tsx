"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
} from "@ui-sdk/react/command";
import { Dialog, DialogBackdrop, DialogContent, DialogTitle } from "@ui-sdk/react/dialog";
import { commandDialog } from "@/components/app/agent";
import { type Collection, type Library, exportJSON, exportMarkdown } from "@/lib/store";
import { download } from "@/lib/libraryFile";
import { OTHER, TYPES } from "@/lib/types";
import type { View } from "@/lib/view";

const itemCls = ({ highlighted }: { highlighted: boolean }) =>
  `flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 transition-colors duration-75 ${highlighted ? "bg-hover text-fg" : "text-muted"}`;
const headingCls = "px-2.5 pt-2.5 pb-1 text-[11px] text-muted";

export function CommandMenu({
  open,
  setOpen,
  lib,
  counts,
  savedLibraries,
  libFilter,
  setLibFilter,
  viewName,
  exportView,
  collection,
  setView,
  copy,
  copyInstall,
  onImportSite,
  onNewCollection,
  onRenameCollection,
  onDeleteCollection,
  onRestoreBackup,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  lib: Library;
  counts: Record<string, number>;
  savedLibraries: string[];
  libFilter: string | null;
  setLibFilter: (name: string) => void;
  viewName: string;
  exportView: string | null;
  collection: Collection | undefined;
  setView: (v: View) => void;
  copy: (text: string, msg: string) => void;
  copyInstall: () => void;
  onImportSite?: () => void;
  onNewCollection: () => void;
  onRenameCollection: (id: string) => void;
  onDeleteCollection: (id: string) => void;
  onRestoreBackup: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [then, setThen] = useState<(() => void) | null>(null);
  const runAfterClose = (fn: () => void) => () => {
    setThen(() => fn);
    setOpen(false);
  };
  const run = (fn: () => void) => () => {
    flushSync(() => setOpen(false));
    fn();
  };
  const pickBackup = () => {
    setOpen(false);
    fileRef.current?.click();
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          onRestoreBackup(f);
          e.target.value = "";
        }}
      />

      <Dialog
        controller={commandDialog}
        open={open}
        onOpenChange={(next) => setOpen(next)}
        onOpenChangeComplete={(next) => {
          if (next || !then) return;
          setThen(null);
          then();
        }}
      >
        <DialogBackdrop className="cmd-backdrop" />
        <DialogContent className="cmd-dialog overflow-hidden rounded-xl border border-line bg-panel shadow-[0_16px_48px_-12px_rgb(0_0_0/0.25)]">
          <DialogTitle className="sr-only">Command menu</DialogTitle>
          <Command filter="contains">
            <CommandInput
              aria-label="Search or run a command"
              placeholder="Search or run a command"
              className="m-1.5 mb-0 block h-10 w-[calc(100%-0.75rem)] rounded-lg bg-field px-3 outline-none transition-colors placeholder:text-faint focus:bg-field-focus"
            />
            <CommandEmpty className="px-3 py-8 text-center text-muted empty:py-0">No results</CommandEmpty>
            <CommandList className="max-h-[52vh] overflow-y-auto p-1.5">
              {lib.bookmarks.length > 0 && (
                <CommandGroup>
                  <CommandGroupLabel className={headingCls}>Bookmarks</CommandGroupLabel>
                  {lib.bookmarks.map((b) => (
                    <CommandItem
                      key={b.id}
                      value={`bookmark:${b.id}`}
                      label={b.title}
                      keywords={[b.library, ...b.tags, ...(b.note ? [b.note] : [])]}
                      onSelect={run(() => window.open(b.url, "_blank", "noopener"))}
                      className={itemCls}
                    >
                      <span className="truncate">{b.title}</span>
                      <span className="ml-auto shrink-0 text-muted">{b.library}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandGroup>
                <CommandGroupLabel className={headingCls}>Go to</CommandGroupLabel>
                {[
                  { id: "starred", name: "Starred" },
                  ...lib.collections,
                  ...[...TYPES, OTHER]
                    .filter((t) => counts[`type:${t.id}`])
                    .map((t) => ({ id: `type:${t.id}`, name: t.name })),
                ].map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`go:${c.id}`}
                    label={c.name}
                    keywords={["go"]}
                    onSelect={run(() => setView(c.id))}
                    className={itemCls}
                  >
                    {c.name}
                  </CommandItem>
                ))}
              </CommandGroup>
              {savedLibraries.length > 1 && (
                <CommandGroup>
                  <CommandGroupLabel className={headingCls}>Filter by library</CommandGroupLabel>
                  {savedLibraries.map((name) => (
                    <CommandItem
                      key={name}
                      value={`filter:${name}`}
                      label={name}
                      keywords={["filter", "library"]}
                      onSelect={run(() => setLibFilter(name))}
                      className={itemCls}
                    >
                      {name}
                      {libFilter === name && <span className="ml-auto text-faint">on</span>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandGroup>
                <CommandGroupLabel className={headingCls}>{`Agent · ${viewName}`}</CommandGroupLabel>
                <CommandItem
                  value="copy-markdown"
                  onSelect={run(() => copy(exportMarkdown(lib, exportView), "Copied for your agent"))}
                  className={itemCls}
                >
                  Copy as Markdown for an AI agent
                </CommandItem>
                <CommandItem
                  value="copy-json"
                  onSelect={run(() => copy(exportJSON(lib, exportView), "Copied as JSON"))}
                  className={itemCls}
                >
                  Copy as JSON for an AI agent
                </CommandItem>
                <CommandItem value="copy-install" onSelect={run(copyInstall)} className={itemCls}>
                  Copy install commands
                </CommandItem>
              </CommandGroup>
              <CommandGroup>
                <CommandGroupLabel className={headingCls}>Library</CommandGroupLabel>
                {onImportSite && (
                  <CommandItem value="import-site" onSelect={runAfterClose(onImportSite)} className={itemCls}>
                    Import every component from a site
                  </CommandItem>
                )}
                <CommandItem value="new-collection" onSelect={run(onNewCollection)} className={itemCls}>
                  New collection
                </CommandItem>
                {collection && (
                  <>
                    <CommandItem
                      value="rename-collection"
                      onSelect={run(() => onRenameCollection(collection.id))}
                      className={itemCls}
                    >
                      Rename “{collection.name}”
                    </CommandItem>
                    <CommandItem
                      value="delete-collection"
                      data-agent-confirm="Deletes this collection"
                      onSelect={runAfterClose(() => onDeleteCollection(collection.id))}
                      className={itemCls}
                    >
                      Delete “{collection.name}”
                    </CommandItem>
                  </>
                )}
                <CommandItem value="export-backup" onSelect={run(() => download(lib))} className={itemCls}>
                  Export backup (JSON)
                </CommandItem>
                <CommandItem
                  value="import-backup"
                  data-agent-confirm="Replaces the library with a backup file"
                  onSelect={pickBackup}
                  className={itemCls}
                >
                  Import backup
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
