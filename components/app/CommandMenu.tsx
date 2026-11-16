"use client";

import { useRef } from "react";
import { Command } from "cmdk";
import { type Collection, type Library, exportJSON, exportMarkdown } from "@/lib/store";
import { download } from "@/lib/libraryFile";
import { OTHER, TYPES } from "@/lib/types";
import type { View } from "@/lib/view";

const itemCls = "flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-muted";

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
  onImportSite: () => void;
  onNewCollection: () => void;
  onRenameCollection: (id: string) => void;
  onDeleteCollection: (id: string) => void;
  onRestoreBackup: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
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

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Command menu"
        className="overflow-hidden rounded-xl border border-line bg-panel shadow-[0_16px_48px_-12px_rgb(0_0_0/0.25)]"
      >
        <Command.Input
          autoFocus
          placeholder="Search or run a command"
          className="m-1.5 mb-0 block h-10 w-[calc(100%-0.75rem)] rounded-lg bg-field px-3 outline-none transition-colors placeholder:text-faint focus:bg-field-focus"
        />
        <Command.List className="max-h-[52vh] overflow-y-auto p-1.5">
          <Command.Empty className="px-3 py-8 text-center text-muted">No results</Command.Empty>
          {lib.bookmarks.length > 0 && (
            <Command.Group heading="Bookmarks">
              {lib.bookmarks.map((b) => (
                <Command.Item
                  key={b.id}
                  value={`${b.title} ${b.library} ${b.tags.join(" ")} ${b.note ?? ""} ${b.id}`}
                  onSelect={run(() => window.open(b.url, "_blank", "noopener"))}
                  className={itemCls}
                >
                  <span className="truncate">{b.title}</span>
                  <span className="ml-auto shrink-0 text-muted">{b.library}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
          <Command.Group heading="Go to">
            {[
              { id: "starred", name: "Starred" },
              ...lib.collections,
              ...[...TYPES, OTHER]
                .filter((t) => counts[`type:${t.id}`])
                .map((t) => ({ id: `type:${t.id}`, name: t.name })),
            ].map((c) => (
              <Command.Item
                key={c.id}
                value={`go ${c.name} ${c.id}`}
                onSelect={run(() => setView(c.id))}
                className={itemCls}
              >
                {c.name}
              </Command.Item>
            ))}
          </Command.Group>
          {savedLibraries.length > 1 && (
            <Command.Group heading="Filter by library">
              {savedLibraries.map((name) => (
                <Command.Item
                  key={name}
                  value={`filter library ${name}`}
                  onSelect={run(() => setLibFilter(name))}
                  className={itemCls}
                >
                  {name}
                  {libFilter === name && <span className="ml-auto text-faint">on</span>}
                </Command.Item>
              ))}
            </Command.Group>
          )}
          <Command.Group heading={`Agent · ${viewName}`}>
            <Command.Item
              onSelect={run(() => copy(exportMarkdown(lib, exportView), "Copied for your agent"))}
              className={itemCls}
            >
              Copy as Markdown for an AI agent
            </Command.Item>
            <Command.Item onSelect={run(() => copy(exportJSON(lib, exportView), "Copied as JSON"))} className={itemCls}>
              Copy as JSON for an AI agent
            </Command.Item>
            <Command.Item onSelect={run(copyInstall)} className={itemCls}>
              Copy install commands
            </Command.Item>
          </Command.Group>
          <Command.Group heading="Library">
            <Command.Item onSelect={run(onImportSite)} className={itemCls}>
              Import every component from a site
            </Command.Item>
            <Command.Item onSelect={run(onNewCollection)} className={itemCls}>
              New collection
            </Command.Item>
            {collection && (
              <>
                <Command.Item onSelect={run(() => onRenameCollection(collection.id))} className={itemCls}>
                  Rename “{collection.name}”
                </Command.Item>
                <Command.Item onSelect={run(() => onDeleteCollection(collection.id))} className={itemCls}>
                  Delete “{collection.name}”
                </Command.Item>
              </>
            )}
            <Command.Item onSelect={run(() => download(lib))} className={itemCls}>
              Export backup (JSON)
            </Command.Item>
            <Command.Item onSelect={run(() => fileRef.current?.click())} className={itemCls}>
              Import backup
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command.Dialog>
    </>
  );
}
