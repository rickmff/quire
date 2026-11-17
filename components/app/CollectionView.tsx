"use client";

import { Tip } from "@/components/ui/tooltip";
import { Card } from "@/components/app/CollectionCard";
import { Empty } from "@/components/app/Empty";
import type { Bookmark, Library } from "@/lib/store";

export function CollectionView({
  title,
  lib,
  ready,
  bookmarks,
  selected,
  libFilter,
  clearLibFilter,
  onAdd,
  onMove,
  onUnstar,
  onType,
  onNote,
  onCopy,
  onAgent,
  onOpen,
}: {
  title: string;
  lib: Library;
  ready: boolean;
  bookmarks: Bookmark[];
  selected: number;
  libFilter: string | null;
  clearLibFilter: () => void;
  onAdd?: (url: string) => void;
  onMove: (bookmarkId: string, collectionId: string | null) => void;
  onUnstar: (bookmarkId: string) => void;
  onType: (bookmarkId: string, type: string) => void;
  onNote: (bookmarkId: string, note: string) => void;
  onCopy: (b: Bookmark) => void;
  onAgent: (b: Bookmark) => void;
  onOpen: (b: Bookmark) => void;
}) {
  return (
    <>
      <div className="flex h-12 items-center justify-between">
        <h1 className="flex items-baseline gap-2">
          <span className="font-medium">{title}</span>
          <span className="text-faint tabular-nums">{bookmarks.length || ""}</span>
        </h1>
        {libFilter && (
          <Tip label="Clear filter">
            <button onClick={clearLibFilter} className="text-[12px] text-muted transition hover:text-fg">
              {libFilter} <span className="text-faint">×</span>
            </button>
          </Tip>
        )}
      </div>

      {ready && lib.bookmarks.length === 0 && onAdd ? (
        <Empty onAdd={(u) => onAdd(`https://${u}`)} />
      ) : ready && bookmarks.length === 0 ? (
        <p className="pt-16 text-center text-muted">
          {onAdd ? "Empty. Paste a link or drag cards here." : "Empty. Star a component, then drag its card here."}
        </p>
      ) : (
        <div data-grid className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 xl:grid-cols-3">
          {bookmarks.map((b) => (
            <Card
              key={b.id}
              b={b}
              lib={lib}
              selected={bookmarks[selected]?.id === b.id}
              onMove={(cid) => onMove(b.id, cid)}
              onUnstar={() => onUnstar(b.id)}
              onType={(t) => onType(b.id, t)}
              onNote={(note) => onNote(b.id, note)}
              onCopy={() => onCopy(b)}
              onAgent={() => onAgent(b)}
              onOpen={() => onOpen(b)}
            />
          ))}
        </div>
      )}
    </>
  );
}
