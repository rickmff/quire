"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { fetchMeta, normalizeUrl, pushLibrary, readLibrary, uid, writeLibrary, type Bookmark } from "@/lib/store";
import type { ClientCatalog } from "@/lib/useCatalog";
import { matchLibrary, titleFromUrl } from "@/lib/libraries";

type AddState =
  | { kind: "confirm"; url: string; label: string }
  | { kind: "saving"; label: string }
  | { kind: "saved"; label: string }
  | { kind: "exists"; label: string }
  | { kind: "error" };

const CLOSE_AFTER_SAVE_MS = 1200;

async function describeLink(url: string, hintTitle?: string, hintImage?: string): Promise<Omit<Bookmark, "id">> {
  const base = { url, tags: [] as string[], collectionId: null, createdAt: Date.now() };
  try {
    const cat: ClientCatalog = await (await fetch("/api/catalog")).json();
    const known = cat.components.find((c) => c.docs.replace(/\/$/, "") === url.replace(/\/$/, ""));
    if (known)
      return {
        ...base,
        title: known.title,
        description: known.description,
        image: known.preview,
        library: cat.libraries.find((l) => l.id === known.library)?.name ?? known.library,
        install: known.install,
        registry: known.item,
        category: known.category,
        type: known.type,
        ref: known.id,
      };
  } catch {}
  const m = matchLibrary(url);
  let meta = null;
  try {
    meta = await fetchMeta(url);
  } catch {}
  return {
    ...base,
    title: hintTitle ?? meta?.title ?? titleFromUrl(url),
    description: meta?.description,
    image: hintImage ?? meta?.image,
    library: meta?.library ?? m.library,
    install: meta?.install ?? m.install,
    tags: meta?.tags ?? [],
  };
}

function Add() {
  const params = useSearchParams();
  const hint = (k: string) => params.get(k)?.trim().slice(0, 300) || undefined;
  const hintTitle = hint("title")?.slice(0, 160);
  const hintImage = /^https:\/\//.test(hint("image") ?? "") ? hint("image") : undefined;
  const url = normalizeUrl(params.get("url") ?? "");
  const wholeSite = url !== null && params.get("mode") === "site";

  const opening = useMemo<AddState>(() => {
    if (!url) return { kind: "error" };
    const label = hintTitle ?? new URL(url).host + new URL(url).pathname.replace(/\/$/, "");
    if (readLibrary().bookmarks.some((b) => b.url === url)) return { kind: "exists", label };
    return { kind: "confirm", url, label };
  }, [url, hintTitle]);
  const [progress, setProgress] = useState<AddState | null>(null);
  const state = progress ?? opening;

  useEffect(() => {
    if (wholeSite) window.location.replace(`/app?import=${encodeURIComponent(url)}`);
  }, [wholeSite, url]);

  const save = async () => {
    if (state?.kind !== "confirm") return;
    const { url, label } = state;
    setProgress({ kind: "saving", label });
    const bookmark = await describeLink(url, hintTitle, hintImage);
    const fresh = readLibrary();
    fresh.bookmarks.unshift({ id: uid(), ...bookmark });
    writeLibrary(fresh);
    await pushLibrary(fresh);
    setProgress({ kind: "saved", label: bookmark.title });
    setTimeout(() => window.close(), CLOSE_AFTER_SAVE_MS);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && window.close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (wholeSite) return null;

  const heading = {
    confirm: "Save to your library?",
    saving: "Saving…",
    saved: "Saved to your library",
    exists: "Already in your library",
    error: "That page can't be saved",
  }[state.kind];

  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="text-center" role="status" aria-live="polite">
        <p className="text-faint">quire</p>
        <h1 className="mt-3 font-normal">{heading}</h1>
        {state.kind !== "error" && <p className="mt-1 line-clamp-2 max-w-xs break-all text-muted">{state.label}</p>}
        {state.kind === "confirm" ? (
          <div className="mt-5 flex justify-center gap-2">
            <button type="button" onClick={() => window.close()} className="btn btn-secondary">
              Cancel
            </button>
            <button type="button" autoFocus onClick={save} className="btn btn-primary">
              Save
            </button>
          </div>
        ) : (
          <Link href="/app" className="mt-5 inline-block text-[12px] text-faint transition hover:text-muted">
            Open library
          </Link>
        )}
      </div>
    </main>
  );
}

export default function AddPage() {
  return (
    <Suspense>
      <Add />
    </Suspense>
  );
}
