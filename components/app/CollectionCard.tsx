"use client";

import { Tip } from "@/components/ui/tooltip";
import StarIcon from "@/components/StarIcon";
import { useState } from "react";
import { type Bookmark, type Library, typeOf } from "@/lib/store";
import { OTHER, TYPES, typeById } from "@/lib/types";
import { AgentButton, OpenDetails } from "@/components/gallery/CardButtons";
import { CopyIcon, FolderIcon, NoteIcon, TagIcon } from "@/components/app/icons";

export function Card({
  b,
  lib,
  selected,
  onMove,
  onUnstar,
  onType,
  onNote,
  onCopy,
  onAgent,
  onOpen,
}: {
  b: Bookmark;
  lib: Library;
  selected: boolean;
  onMove: (cid: string | null) => void;
  onUnstar: () => void;
  onType: (type: string) => void;
  onNote: (note: string) => void;
  onCopy: () => void;
  onAgent: () => void;
  onOpen: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [imgOk, setImgOk] = useState(true);

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/bookmark-id", b.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      data-card={b.id}
      className="group pop"
    >
      <div className="relative">
        <div
          className={`block aspect-[16/10] overflow-hidden rounded-lg bg-hover ring-inset transition ${selected ? "ring-2 ring-faint" : "ring-1 ring-line"}`}
        >
          {b.image && imgOk ? (
            <img
              src={b.image}
              alt=""
              loading="lazy"
              draggable={false}
              onError={() => setImgOk(false)}
              className="size-full object-cover transition duration-500 ease-out group-hover:scale-[1.015]"
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2.5">
              <Favicon url={b.url} />
              <span className="text-[15px] font-medium tracking-tight text-faint">{b.library}</span>
            </div>
          )}
        </div>
        <OpenDetails onClick={onOpen} />

        <Tip label="Remove from Starred">
          <button
            type="button"
            data-star
            onClick={onUnstar}
            aria-pressed
            aria-label={`Remove ${b.title} from Starred`}
            className="absolute top-2 right-2 z-10 flex size-7 items-center justify-center rounded-md bg-bg/80 shadow-sm ring-1 ring-line backdrop-blur-sm transition hover:bg-bg"
          >
            <StarIcon filled />
          </button>
        </Tip>
        <CardTools
          b={b}
          lib={lib}
          onMove={onMove}
          onType={onType}
          onNote={() => setEditing(true)}
          onCopy={onCopy}
          className="top-2 right-11 z-10"
        />
      </div>

      <div className="mt-3 px-0.5">
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 truncate first-letter:uppercase">{b.title}</span>
          <AgentButton onClick={onAgent} />
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate text-[12px] text-faint">
            {typeById(typeOf(b)).name}
            {b.description && <span className="text-faint"> · {b.description}</span>}
          </p>
          <span className="shrink-0 text-[12px] text-faint">{b.library}</span>
        </div>

        {b.install && (
          <Tip label="Copy install command">
            <button
              onClick={onCopy}
              className="mt-1 block max-w-full truncate text-left font-mono text-[11px] text-faint transition hover:text-muted"
            >
              {b.install}
            </button>
          </Tip>
        )}

        {editing ? (
          <textarea
            autoFocus
            rows={2}
            defaultValue={b.note}
            placeholder="A note for your agent"
            onBlur={(e) => {
              onNote(e.target.value.trim());
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) (e.target as HTMLTextAreaElement).blur();
              if (e.key === "Escape") setEditing(false);
            }}
            className="mt-1.5 w-full resize-none rounded-md bg-field px-2 py-1.5 text-[12px] outline-none transition-colors focus:bg-field-focus placeholder:text-faint"
          />
        ) : (
          b.note && (
            <p onClick={() => setEditing(true)} className="mt-1 line-clamp-2 cursor-text text-[12px] text-muted">
              {b.note}
            </p>
          )
        )}
      </div>
    </article>
  );
}
function CardTools({
  b,
  lib,
  onMove,
  onType,
  onNote,
  onCopy,
  className,
}: {
  b: Bookmark;
  lib: Library;
  onMove: (cid: string | null) => void;
  onType: (type: string) => void;
  onNote: () => void;
  onCopy: () => void;
  className: string;
}) {
  return (
    <div
      className={`absolute ${className} flex items-center gap-0.5 rounded-md bg-panel/90 p-0.5 opacity-0 shadow-sm ring-1 ring-line backdrop-blur transition group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100`}
    >
      <IconBtn label={b.install ? "Copy install command" : "Copy link"} onClick={onCopy} data="copy">
        <CopyIcon />
      </IconBtn>
      <IconBtn label="Note for your agent" onClick={onNote}>
        <NoteIcon />
      </IconBtn>
      <Tip label="Move to collection">
        <label className="relative grid size-6 cursor-pointer place-items-center rounded text-muted transition hover:bg-hover hover:text-fg">
          <FolderIcon />
          <select
            value={b.collectionId ?? ""}
            onChange={(e) => onMove(e.target.value || null)}
            aria-label="Move to collection"
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            <option value="">No collection</option>
            {lib.collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </Tip>
      <Tip label="Change type">
        <label className="relative grid size-6 cursor-pointer place-items-center rounded text-muted transition hover:bg-hover hover:text-fg">
          <TagIcon />
          <select
            value={typeOf(b)}
            onChange={(e) => onType(e.target.value)}
            aria-label="Component type"
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            {[...TYPES, OTHER].map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </Tip>
    </div>
  );
}
export function StarredTools({
  b,
  lib,
  onMove,
  onType,
  onNote,
  onCopy,
}: {
  b: Bookmark;
  lib: Library;
  onMove: (cid: string | null) => void;
  onType: (type: string) => void;
  onNote: (note: string) => void;
  onCopy: () => void;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} className="contents">
      <CardTools
        b={b}
        lib={lib}
        onMove={onMove}
        onType={onType}
        onNote={() => setEditing(true)}
        onCopy={onCopy}
        className="top-2 right-11 z-10"
      />
      {editing && (
        <textarea
          autoFocus
          rows={2}
          defaultValue={b.note}
          placeholder="A note for your agent"
          onBlur={(e) => {
            onNote(e.target.value.trim());
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) (e.target as HTMLTextAreaElement).blur();
            if (e.key === "Escape") setEditing(false);
          }}
          className="absolute top-11 right-2 left-2 z-10 resize-none rounded-md bg-panel px-2 py-1.5 text-[12px] shadow-sm ring-1 ring-line outline-none placeholder:text-faint"
        />
      )}
    </div>
  );
}
function IconBtn({
  label,
  onClick,
  children,
  data,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  data?: string;
}) {
  return (
    <Tip label={label}>
      <button
        onClick={onClick}
        {...(data ? { [`data-${data}`]: "" } : {})}
        aria-label={label}
        className="grid size-6 place-items-center rounded text-muted transition hover:bg-hover hover:text-fg"
      >
        {children}
      </button>
    </Tip>
  );
}
function Favicon({ url }: { url: string }) {
  const [ok, setOk] = useState(true);
  let src = "";
  try {
    src = new URL("/favicon.ico", url).href;
  } catch {}
  if (!src || !ok) return null;
  return (
    <img
      src={src}
      alt=""
      width={20}
      height={20}
      onError={() => setOk(false)}
      className="size-5 rounded opacity-70 grayscale"
    />
  );
}
