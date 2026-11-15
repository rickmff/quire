"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchMeta, normalizeUrl, pushLibrary, readLibrary, uid, writeLibrary } from "@/lib/store";
import type { ClientCatalog } from "@/lib/useCatalog";
import { matchLibrary, titleFromUrl } from "@/lib/libraries";

function Add() {
  const params = useSearchParams();
  const [state, setState] = useState<"saving" | "saved" | "exists" | "error">("saving");
  const [title, setTitle] = useState("");

  useEffect(() => {
    const url = normalizeUrl(params.get("url") ?? "");
    if (!url) return setState("error");
    if (params.get("mode") === "site") return window.location.replace(`/app?import=${encodeURIComponent(url)}`);
    const lib = readLibrary();
    if (lib.bookmarks.some((b) => b.url === url)) return setState("exists");
    // The extension can pass what it read from the page, e.g. a post on X.
    const hint = (k: string) => params.get(k)?.trim().slice(0, 300) || undefined;
    const hintTitle = hint("title")?.slice(0, 160);
    const hintImage = /^https:\/\//.test(hint("image") ?? "") ? hint("image") : undefined;
    (async () => {
      const m = matchLibrary(url);
      // A page of the curated catalog: save it with its catalog id, so agents get its source.
      let known: ClientCatalog["components"][number] | undefined;
      try {
        const cat: ClientCatalog = await (await fetch("/api/catalog")).json();
        known = cat.components.find((c) => c.docs.replace(/\/$/, "") === url.replace(/\/$/, ""));
        if (known) {
          const fresh = readLibrary();
          fresh.bookmarks.unshift({
            id: uid(),
            url,
            title: known.title,
            description: known.description,
            image: known.preview,
            library: cat.libraries.find((l) => l.id === known!.library)?.name ?? known.library,
            install: known.install,
            registry: known.item,
            category: known.category,
            type: known.type,
            ref: known.id,
            tags: [],
            collectionId: null,
            createdAt: Date.now(),
          });
          writeLibrary(fresh);
          await pushLibrary(fresh);
          setTitle(known.title);
          setState("saved");
          setTimeout(() => window.close(), 1200);
          return;
        }
      } catch {}
      let meta = null;
      try {
        meta = await fetchMeta(url);
      } catch {}
      const fresh = readLibrary();
      fresh.bookmarks.unshift({
        id: uid(),
        url,
        title: hintTitle ?? meta?.title ?? titleFromUrl(url),
        description: meta?.description,
        image: hintImage ?? meta?.image,
        library: meta?.library ?? m.library,
        install: meta?.install ?? m.install,
        tags: meta?.tags ?? [],
        collectionId: null,
        createdAt: Date.now(),
      });
      writeLibrary(fresh);
      await pushLibrary(fresh);
      setTitle(hintTitle ?? meta?.title ?? url);
      setState("saved");
      setTimeout(() => window.close(), 1200);
    })();
  }, [params]);

  const text = {
    saving: "Saving…",
    saved: "Saved to your Inbox",
    exists: "Already in your library",
    error: "That page can't be saved",
  }[state];

  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="text-center">
        <p className="text-faint">quire</p>
        <p className="mt-3">{text}</p>
        {title && <p className="mt-1 line-clamp-2 max-w-xs text-muted">{title}</p>}
        <a href="/app" className="mt-5 inline-block text-[12px] text-faint transition hover:text-muted">
          Open library
        </a>
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
