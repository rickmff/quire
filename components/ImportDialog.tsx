"use client";

import { useEffect, useMemo, useState } from "react";
import type { ImportItem, ImportResult } from "@/app/api/import/route";
import { normalizeUrl } from "@/lib/store";
import { OTHER, TYPES, typeById } from "@/lib/types";

export type ImportChoice = { result: ImportResult; items: ImportItem[]; collection: string | null };

const SOURCE: Record<ImportResult["source"], string> = {
  registry: "shadcn registry",
  links: "page links",
  sitemap: "sitemap",
};

export default function ImportDialog({
  initialUrl,
  savedUrls,
  onClose,
  onImport,
}: {
  initialUrl: string;
  savedUrls: Set<string>;
  onClose: () => void;
  onImport: (choice: ImportChoice) => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [status, setStatus] = useState<
    | { kind: "empty" }
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "found"; result: ImportResult }
  >({ kind: "empty" });
  const result = status.kind === "found" ? status.result : null;
  const [items, setItems] = useState<(ImportItem & { on: boolean })[]>([]);
  const [toCollection, setToCollection] = useState(true);

  const find = async (raw: string) => {
    const u = normalizeUrl(raw);
    if (!u) return setStatus({ kind: "error", message: "Not a link" });
    setStatus({ kind: "loading" });
    try {
      const res = await fetch(`/api/import?url=${encodeURIComponent(u)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not read that site");
      const r = data as ImportResult;
      setItems(r.items.map((i) => ({ ...i, on: !savedUrls.has(i.url) })));
      setStatus({ kind: "found", result: r });
    } catch (e) {
      setStatus({ kind: "error", message: e instanceof Error ? e.message : "Could not read that site" });
    }
  };

  useEffect(() => {
    if (initialUrl) find(initialUrl);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const groups = useMemo(() => {
    const order = [...TYPES, OTHER].map((t) => t.id);
    const m = new Map<string, number[]>();
    items.forEach((it, i) => m.set(it.type, [...(m.get(it.type) ?? []), i]));
    return [...m.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  }, [items]);

  const chosen = items.filter((i) => i.on);
  const set = (i: number, patch: Partial<ImportItem & { on: boolean }>) =>
    setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/30 p-4 pt-[8vh]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-label="Import a site"
        onMouseDown={(e) => e.stopPropagation()}
        className="pop flex max-h-[84vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-[0_16px_48px_-12px_rgb(0_0_0/0.25)]"
      >
        <form
          className="flex gap-1.5 p-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            find(url);
          }}
        >
          <input
            autoFocus={!initialUrl}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="A component site, e.g. rareui.com/components"
            aria-label="Site to import"
            spellCheck={false}
            className="h-10 min-w-0 flex-1 rounded-lg bg-field px-3 outline-none transition-colors placeholder:text-faint focus:bg-field-focus"
          />
          <button
            type="submit"
            disabled={status.kind === "loading"}
            className="shrink-0 rounded-lg px-3 text-muted transition hover:bg-hover hover:text-fg disabled:opacity-50"
          >
            Find
          </button>
        </form>

        <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-1.5">
          {status.kind === "loading" && <p className="px-3 py-10 text-center text-muted">Reading the site…</p>}
          {status.kind === "error" && <p className="px-3 py-10 text-center text-muted">{status.message}</p>}
          {status.kind === "empty" && (
            <p className="px-3 py-10 text-center text-muted">
              Paste the page that lists a library&apos;s components. quire finds each one and sorts it by type.
            </p>
          )}
          {result && (
            <>
              <p className="px-2.5 py-2 text-[12px] text-faint">
                {result.items.length} components on {result.site} · from the {SOURCE[result.source]}
              </p>
              {groups.map(([type, idx]) => (
                <section key={type} className="mb-2">
                  <h3 className="px-2.5 pt-2 pb-1 text-[11px] text-faint">
                    {typeById(type).name} <span className="tabular-nums">{idx.length}</span>
                  </h3>
                  {idx.map((i) => {
                    const it = items[i];
                    const saved = savedUrls.has(it.url);
                    return (
                      <label
                        key={it.url}
                        className="flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-1.5 hover:bg-hover"
                      >
                        <input
                          type="checkbox"
                          checked={it.on}
                          disabled={saved}
                          onChange={(e) => set(i, { on: e.target.checked })}
                          className="accent-current"
                        />
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate ${saved ? "text-faint" : ""}`}>
                            {it.title}
                            {saved && " · saved"}
                          </span>
                          {it.description && (
                            <span className="block truncate text-[12px] text-faint">{it.description}</span>
                          )}
                        </span>
                        <select
                          value={it.type}
                          onChange={(e) => set(i, { type: e.target.value })}
                          aria-label={`Type of ${it.title}`}
                          className="shrink-0 rounded bg-transparent text-[12px] text-muted outline-none"
                        >
                          {[...TYPES, OTHER].map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  })}
                </section>
              ))}
            </>
          )}
        </div>

        {result && (
          <div className="flex items-center justify-between gap-3 border-t border-line px-3 py-2.5">
            <label className="flex items-center gap-2 text-[12px] text-muted">
              <input type="checkbox" checked={toCollection} onChange={(e) => setToCollection(e.target.checked)} />
              Also add to a “{result.site}” collection
            </label>
            <button
              disabled={!chosen.length}
              onClick={() => onImport({ result, items: chosen, collection: toCollection ? result.site : null })}
              className="btn btn-sm btn-primary"
            >
              Import {chosen.length}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
