"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import ImportDialog from "@/components/ImportDialog";
import { CollectionView } from "@/components/app/CollectionView";
import { registerAgent } from "@/components/app/agent";
import { CommandMenu } from "@/components/app/CommandMenu";
import { ConfirmRemove } from "@/components/app/ConfirmRemove";
import { StarredTools } from "@/components/app/CollectionCard";
import { Sidebar, type SidebarEdit } from "@/components/app/Sidebar";
import { Toast } from "@/components/app/Toast";
import { TopBar } from "@/components/app/TopBar";
import { useDropServiceWorkers } from "@/components/app/useDropServiceWorkers";
import { useGalleryData } from "@/components/app/useGalleryData";
import { useGridKeys } from "@/components/app/useGridKeys";
import { useLibraryActions } from "@/components/app/useLibraryActions";
import { type BarMode, useShortcuts } from "@/components/app/useShortcuts";
import { useToast } from "@/components/app/useToast";
import { useViewRoute } from "@/components/app/useViewRoute";
import { useViewSettle } from "@/components/app/useViewSettle";
import { Agents } from "@/components/gallery/Agents";
import { Detail } from "@/components/gallery/Detail";
import { Gallery } from "@/components/gallery/Gallery";
import { Sources } from "@/components/gallery/Sources";
import { groupLabel } from "@/lib/groups";
import { mergeLibrary } from "@/lib/libraryFile";
import { type Library, useLibrary } from "@/lib/store";
import { typeById } from "@/lib/types";
import { type GalleryItem, useCatalog, useSyncAvailable } from "@/lib/useCatalog";
import { useIntro } from "@/lib/useIntro";
import { PAGES, type View, groupView, isGallery, siteView, typeView } from "@/lib/view";

type AppDialog = { kind: "import"; url: string } | { kind: "delete"; id: string } | null;

function viewTitle(view: View, sites: { key: string; name: string }[], collectionName: string | undefined) {
  if (view === "starred") return "Starred";
  if (view === "libraries") return "All libraries";
  const type = typeView(view);
  if (type) return typeById(type).name;
  const site = siteView(view);
  if (site) {
    const group = groupView(view);
    return [sites.find((x) => x.key === site)?.name ?? "Library", group && groupLabel(group)]
      .filter(Boolean)
      .join(" · ");
  }
  return collectionName ?? "Starred";
}

export default function App() {
  const { lib, ready, update } = useLibrary();
  const [view, setView] = useViewRoute();
  const catalog = useCatalog();
  const syncOk = useSyncAvailable();
  const { toast, flash, dismiss: dismissToast } = useToast();

  const [open, setOpen] = useState<GalleryItem | null>(null);
  const [input, setInput] = useState("");
  const [barMode, setBarMode] = useState<BarMode>("search");
  const [palette, setPalette] = useState(false);
  const [edit, setEdit] = useState<SidebarEdit>(null);
  const [dialog, setDialog] = useState<AppDialog>(null);
  const [libFilter, setLibFilter] = useState<string | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(registerAgent, []);

  const query = barMode === "search" ? input.trim().toLowerCase() : "";
  const words = useMemo(() => query.split(/\s+/).filter(Boolean), [query]);

  const data = useGalleryData({ lib, catalog, view, words, libFilter });
  const { fresh, followed, galleryView, sites, starredSites, bookmarksInView, counts } = data;
  const act = useLibraryActions({
    lib,
    update,
    catalog,
    byDocs: data.byDocs,
    followed,
    galleryItems: data.galleryItems,
    view,
    setView,
    flash,
    dismissToast,
  });

  const nothingToDeal = Boolean(ready && catalog) && (!isGallery(view) || galleryView.length === 0);
  const intro = useIntro({ nothingToDeal });

  useViewSettle(mainRef, view, intro.phase === "done");
  useDropServiceWorkers();

  const startImport = (raw: string) => {
    if (!act.followCurated(raw)) setDialog({ kind: "import", url: raw });
  };

  useShortcuts({
    togglePalette: () => setPalette((p) => !p),
    focusBar: (mode) => {
      setBarMode(mode);
      inputRef.current?.focus();
    },
    addLink: act.add,
  });

  const listsBookmarks = !isGallery(view) && !PAGES.has(view ?? "");
  const selected = useGridKeys(listsBookmarks ? bookmarksInView : [], {
    paused: palette,
    resetOn: `${view}|${libFilter}`,
  });

  useEffect(() => {
    if (ready && catalog && fresh)
      update((l) => (l.mode ? l : { ...l, mode: "curated", sources: l.sources ?? catalog.libraries.map((x) => x.id) }));
  }, [ready, catalog, fresh, update]);

  const importFromAddress = useEffectEvent(() => {
    const url = new URLSearchParams(window.location.search).get("import");
    if (!url) return;
    startImport(url);
    window.history.replaceState(null, "", window.location.pathname);
  });
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (catalog) importFromAddress();
  }, [catalog]);

  const collection =
    typeof view === "string" && view !== "all" ? lib.collections.find((c) => c.id === view) : undefined;
  const viewName = viewTitle(view, sites, collection?.name);
  const exportView = view === "starred" || view === "libraries" ? "all" : view;

  const restoreBackup = async (file: File) => {
    try {
      const backup = JSON.parse(await file.text()) as Library;
      update((l) => mergeLibrary(l, backup));
      flash("Imported");
    } catch {
      flash("Not a quire file");
    }
  };

  return (
    <div data-intro={intro.phase === "done" ? undefined : intro.phase} className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar
        lib={lib}
        view={view}
        setView={setView}
        counts={counts}
        edit={edit}
        setEdit={setEdit}
        createCollection={(name) => {
          setEdit(null);
          act.createCollection(name);
        }}
        renameCollection={(id, name) => {
          setEdit(null);
          act.renameCollection(id, name);
        }}
        deleteCollection={(id) => setDialog({ kind: "delete", id })}
        moveTo={act.dropTo}
        sites={sites}
        reorderSites={(keys) => update((l) => ({ ...l, siteOrder: keys }))}
        openItem={setOpen}
        openId={open?.id}
      />

      <main ref={mainRef} className="min-w-0 flex-1 px-4 pb-24 md:pr-10 md:pl-10">
        <TopBar
          input={input}
          setInput={setInput}
          mode={barMode}
          setMode={setBarMode}
          inputRef={inputRef}
          viewName={viewName}
          onAdd={act.add}
          onImport={startImport}
        />

        {isGallery(view) ? (
          <Gallery
            items={galleryView}
            title={viewName}
            sections={view === "starred" && starredSites.length > 1 && !words.length ? starredSites : undefined}
            onSite={(key) => setView(`site:${key}`)}
            libraries={catalog?.libraries ?? []}
            onOpen={setOpen}
            onStar={act.toggleStar}
            tools={(i) => {
              const b = i.saved ? lib.bookmarks.find((x) => x.id === i.saved) : undefined;
              return b ? (
                <StarredTools
                  b={b}
                  lib={lib}
                  onMove={(cid) => act.moveAndSay(b.id, cid)}
                  onType={(t) => act.setType(b.id, t)}
                  onNote={(note) => act.setNote(b.id, note)}
                  onCopy={() => act.copyCommand(b)}
                />
              ) : null;
            }}
            intro={intro.phase === "wait" && Boolean(catalog)}
            onDeal={intro.dealt}
            onAgent={(text) => act.copy(text, "Copied for your agent")}
            empty={
              !catalog ? (
                <div />
              ) : words.length ? (
                <p className="pt-16 text-center text-muted">No components match “{input.trim()}”.</p>
              ) : view === "starred" ? (
                <p className="mx-auto max-w-sm pt-20 text-center text-muted">
                  Nothing starred yet. Open a library below and tap the star on a component.
                </p>
              ) : (
                <div />
              )
            }
          />
        ) : view === "sites" ? (
          <Sources
            libraries={catalog?.libraries ?? []}
            followed={followed}
            onToggle={(id) => {
              const next = new Set(followed);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              act.setFollowed(next);
            }}
            onAll={(on) => act.setFollowed(new Set(on ? (catalog?.libraries ?? []).map((l) => l.id) : []))}
            onAddSite={() => setDialog({ kind: "import", url: "" })}
            imported={data.importedSites}
          />
        ) : view === "agents" ? (
          <Agents
            syncKey={lib.syncKey}
            syncedAt={lib.syncedAt}
            available={syncOk}
            onEnable={act.enableSync}
            onSyncNow={act.syncNow}
            copy={act.copy}
          />
        ) : (
          <CollectionView
            title={viewName}
            lib={lib}
            ready={ready}
            bookmarks={bookmarksInView}
            selected={selected}
            libFilter={libFilter}
            clearLibFilter={() => setLibFilter(null)}
            onAdd={act.add}
            onMove={act.moveAndSay}
            onUnstar={act.removeBookmark}
            onType={act.setType}
            onNote={act.setNote}
            onCopy={act.copyCommand}
            onAgent={act.copyForAgent}
            onOpen={(b) => setOpen(act.itemFor(b))}
          />
        )}
      </main>

      {open && (
        <Detail
          item={open}
          site={open.site ?? catalog?.libraries.find((l) => l.id === open.library)?.name ?? open.library}
          saved={lib.bookmarks.some((b) => b.id === open.saved || b.ref === open.id || b.url === open.docs)}
          onClose={() => setOpen(null)}
          onStar={() => act.toggleStar(open)}
          copy={act.copy}
        />
      )}

      <CommandMenu
        open={palette}
        setOpen={setPalette}
        lib={lib}
        counts={counts}
        savedLibraries={data.savedLibraries}
        libFilter={libFilter}
        setLibFilter={setLibFilter}
        viewName={viewName}
        exportView={exportView}
        collection={collection}
        setView={setView}
        copy={act.copy}
        copyInstall={() => act.copyInstall(bookmarksInView)}
        onImportSite={() => setDialog({ kind: "import", url: "" })}
        onNewCollection={() => setEdit({ kind: "new", name: "" })}
        onRenameCollection={(id) => setEdit({ kind: "rename", id })}
        onDeleteCollection={(id) => setDialog({ kind: "delete", id })}
        onRestoreBackup={restoreBackup}
      />

      {dialog?.kind === "delete" && (
        <ConfirmRemove
          name={lib.collections.find((c) => c.id === dialog.id)?.name ?? "this collection"}
          count={lib.bookmarks.filter((b) => b.collectionId === dialog.id).length}
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            act.deleteCollection(dialog.id);
            setDialog(null);
          }}
        />
      )}

      {dialog?.kind === "import" && (
        <ImportDialog
          initialUrl={dialog.url}
          savedUrls={new Set(lib.bookmarks.map((b) => b.url))}
          onClose={() => setDialog(null)}
          onImport={(choice) => {
            act.importSite(choice);
            setDialog(null);
          }}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}
