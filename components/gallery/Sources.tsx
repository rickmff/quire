"use client";

import { type CatalogLibrary } from "@/lib/catalog/schema";

export function Sources({
  libraries,
  followed,
  onToggle,
  onAll,
  onAddSite,
  imported,
}: {
  libraries: CatalogLibrary[];
  followed: Set<string>;
  onToggle: (id: string) => void;
  onAll: (on: boolean) => void;
  onAddSite?: () => void;
  imported: { name: string; count: number }[];
}) {
  return (
    <section className="max-w-2xl pb-24">
      <div className="flex h-12 items-center justify-between">
        <h1 className="font-medium">Sites</h1>
        <div className="flex gap-1 text-[12px]">
          <button onClick={() => onAll(true)} className="rounded-md px-2 py-1 text-faint transition hover:text-muted">
            All on
          </button>
          <button onClick={() => onAll(false)} className="rounded-md px-2 py-1 text-faint transition hover:text-muted">
            All off
          </button>
        </div>
      </div>
      <p className="mb-4 text-muted">The curated sites in your library. Agents only see the sites you keep on.</p>
      <ul className="divide-y divide-line">
        {libraries.map((l) => {
          const on = followed.has(l.id);
          return (
            <li key={l.id} className="flex items-center gap-4 py-2.5">
              <button
                role="switch"
                aria-checked={on}
                aria-label={l.name}
                onClick={() => onToggle(l.id)}
                className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${on ? "bg-fg" : "bg-hover ring-1 ring-line ring-inset"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 size-3 rounded-full bg-bg transition-transform duration-200 ${on ? "translate-x-3" : ""}`}
                />
              </button>
              <div className="min-w-0 flex-1">
                <a href={l.url} target="_blank" rel="noreferrer" className={on ? "" : "text-muted"}>
                  {l.name}
                </a>
                <p className="truncate text-[12px] text-faint">{l.blurb}</p>
              </div>
              <span className="shrink-0 text-[12px] text-faint tabular-nums">{l.count}</span>
            </li>
          );
        })}
      </ul>

      {(onAddSite || imported.length > 0) && (
        <div className="mt-10 flex h-8 items-center justify-between">
          <h2 className="font-medium">Your sites</h2>
          {onAddSite && (
            <button onClick={onAddSite} className="text-[12px] text-muted transition hover:text-fg">
              Add a site by link
            </button>
          )}
        </div>
      )}
      {imported.length ? (
        <ul className="mt-2 divide-y divide-line">
          {imported.map((s) => (
            <li key={s.name} className="flex justify-between py-2.5">
              <span>{s.name}</span>
              <span className="text-[12px] text-faint tabular-nums">{s.count}</span>
            </li>
          ))}
        </ul>
      ) : onAddSite ? (
        <p className="mt-2 text-muted">
          Paste the link of any component library. Quire reads it and adds each component by type.
        </p>
      ) : null}
    </section>
  );
}
