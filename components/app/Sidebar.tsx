"use client";

import { useEffect, useRef } from "react";
import { type Library } from "@/lib/store";
import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import { type GalleryItem } from "@/lib/useCatalog";
import { type View, groupView, siteView } from "@/lib/view";
import { shiftFor, useSiteDrag } from "@/components/app/useSiteDrag";
import { NavItem } from "@/components/app/NavItem";
import { Collapse, SiteGroups } from "@/components/app/SiteGroups";

export type SidebarEdit = { kind: "new"; name: string } | { kind: "rename"; id: string } | null;
export function Sidebar(props: {
  lib: Library;
  view: View;
  setView: (v: View) => void;
  counts: Record<string, number>;
  edit: SidebarEdit;
  setEdit: (edit: SidebarEdit) => void;
  createCollection: (name: string) => void;
  renameCollection: (id: string, name: string) => void;
  deleteCollection: (id: string) => void;
  moveTo: (bookmarkId: string, target: View) => void;
  sites: { key: string; name: string; items: GalleryItem[] }[];
  reorderSites: (keys: string[]) => void;
  openItem: (item: GalleryItem) => void;
  openId?: string;
}) {
  const { lib, view, setView, counts, edit, setEdit, sites, openItem, openId } = props;
  const activeSite = siteView(view);
  const { drag, blockRef, onPointerDown, onClickCapture } = useSiteDrag(
    sites.map((x) => x.key),
    props.reorderSites,
  );

  const ruler = useRef<HTMLElement>(null);
  const grow = (e: React.MouseEvent) => {
    for (const el of ruler.current?.querySelectorAll<HTMLElement>("[data-row]") ?? []) {
      const r = el.getBoundingClientRect();
      const d = Math.abs(e.clientY - (r.top + r.height / 2)) / r.height;
      el.style.setProperty("--grow", String(Math.max(0, 1 - d / 3).toFixed(2)));
    }
  };
  const settle = () =>
    ruler.current?.querySelectorAll<HTMLElement>("[data-row]").forEach((el) => el.style.removeProperty("--grow"));
  useEffect(() => {
    ruler.current?.querySelector("[aria-current=page]")?.scrollIntoView({ block: "nearest" });
  }, [view]);

  return (
    <aside data-chrome className="md:sticky md:top-0 md:h-dvh md:w-56 md:shrink-0">
      <div className="flex h-full flex-col px-3 pt-4 md:px-4">
        <div className="flex h-10 items-center px-2 md:h-7 md:pl-[34px]">
          <Link href="/" aria-label="quire home" className="rounded-sm">
            <Wordmark className="block h-6 w-auto text-fg md:h-[26px]" />
          </Link>
        </div>

        <nav
          ref={ruler}
          onMouseMove={grow}
          onMouseLeave={settle}
          className="ruler -mx-1 mt-2 flex gap-0.5 overflow-x-auto pb-2 md:mx-0 md:mt-2 md:min-h-0 md:flex-1 md:flex-col md:gap-0 md:overflow-y-auto"
        >
          <div className="contents md:flex md:flex-col md:gap-2.5 md:pt-1">
            {edit?.kind === "new" ? (
              <input
                autoFocus
                value={edit.name}
                onChange={(e) => setEdit({ kind: "new", name: e.target.value })}
                onBlur={() => props.createCollection(edit.name)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") props.createCollection(edit.name);
                  if (e.key === "Escape") setEdit(null);
                }}
                placeholder="Name"
                className="h-7 shrink-0 rounded-md bg-field px-2 outline-none transition-colors focus:bg-field-focus placeholder:text-faint md:ml-[34px]"
              />
            ) : (
              <button
                data-row
                onClick={() => setEdit({ kind: "new", name: "" })}
                className="group flex h-7 shrink-0 items-center gap-2 rounded-md px-2 text-left whitespace-nowrap text-faint transition hover:text-muted md:rounded-none md:px-0"
              >
                <span className="hidden w-[26px] shrink-0 md:block">
                  <span data-tick className="block h-px bg-faint group-hover:bg-muted" />
                </span>
                New collection
              </button>
            )}
            <NavItem id="starred" name="Starred" count={counts.starred ?? 0} {...props} />
          </div>
          {lib.collections.length > 0 && <div className="hidden h-3 md:block" />}
          {lib.collections.map((c) =>
            edit?.kind === "rename" && edit.id === c.id ? (
              <input
                key={c.id}
                autoFocus
                defaultValue={c.name}
                onBlur={(e) => props.renameCollection(c.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setEdit(null);
                }}
                className="h-7 shrink-0 rounded-md bg-field px-2 outline-none transition-colors focus:bg-field-focus md:ml-[34px]"
              />
            ) : (
              <NavItem
                key={c.id}
                id={c.id}
                name={c.name}
                count={counts[c.id] ?? 0}
                onRename={() => setEdit({ kind: "rename", id: c.id })}
                onDelete={() => props.deleteCollection(c.id)}
                {...props}
              />
            ),
          )}
          {sites.length > 0 && (
            <>
              <div className="hidden h-4 md:block" />
              <span className="hidden pb-1 pl-[34px] text-[11px] text-faint md:block">Libraries</span>
              <NavItem
                id="libraries"
                name="All libraries"
                count={sites.reduce((n, x) => n + x.items.length, 0)}
                {...props}
              />
              {sites.map((x, i) => {
                const dragging = drag?.key === x.key;
                return (
                  <div
                    key={x.key}
                    ref={blockRef(x.key)}
                    onPointerDown={(e) => onPointerDown(e, x.key)}
                    onClickCapture={onClickCapture}
                    style={drag ? { transform: `translateY(${dragging ? drag.dy : shiftFor(drag, i)}px)` } : undefined}
                    className={`contents md:relative md:flex md:shrink-0 md:flex-col ${
                      !drag
                        ? ""
                        : dragging
                          ? `z-10 ${drag.settling ? "transition-transform duration-150 ease-out" : ""}`
                          : "transition-transform duration-200 ease-out"
                    }`}
                  >
                    {dragging && (
                      <span
                        aria-hidden
                        className={`pointer-events-none absolute -inset-x-1.5 top-0 -z-10 hidden h-7 rounded-md bg-hover transition-[opacity,box-shadow] duration-150 md:block ${
                          drag.settling ? "opacity-0" : "shadow-[0_8px_18px_-8px_rgb(0_0_0/0.45)]"
                        }`}
                      />
                    )}
                    <NavItem id={`site:${x.key}`} name={x.name} count={x.items.length} {...props} />
                    <Collapse open={activeSite === x.key} className="hidden md:grid">
                      <SiteGroups
                        items={x.items}
                        openItem={openItem}
                        openId={openId}
                        active={activeSite === x.key ? groupView(view) : null}
                        onGroup={(g) => setView(g ? `site:${x.key}|${g}` : `site:${x.key}`)}
                      />
                    </Collapse>
                  </div>
                );
              })}
            </>
          )}
        </nav>

        <div className="-mx-1 flex shrink-0 gap-0.5 pb-2 md:mx-0 md:flex-col md:border-t md:border-line md:pt-3 md:pb-5">
          <NavItem id="sites" name="Sites" count={0} {...props} />
          <NavItem id="agents" name="Agents" count={0} {...props} />
        </div>
      </div>
    </aside>
  );
}
