"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchMeta, normalizeUrl, readLibrary, uid, writeLibrary } from "@/lib/store";
import { matchLibrary, titleFromUrl } from "@/lib/libraries";

function Add() {
  const params = useSearchParams();
  const [state, setState] = useState<"saving" | "saved" | "exists" | "error">("saving");
  const [title, setTitle] = useState("");

  useEffect(() => {
    const url = normalizeUrl(params.get("url") ?? "");
    if (!url) return setState("error");
    const lib = readLibrary();
    if (lib.bookmarks.some((b) => b.url === url)) return setState("exists");
    (async () => {
      const m = matchLibrary(url);
      let meta = null;
      try {
        meta = await fetchMeta(url);
      } catch {}
      const fresh = readLibrary();
      fresh.bookmarks.unshift({
        id: uid(),
        url,
        title: meta?.title ?? titleFromUrl(url),
        description: meta?.description,
        image: meta?.image,
        library: meta?.library ?? m.library,
        install: meta?.install ?? m.install,
        tags: meta?.tags ?? [],
        collectionId: null,
        createdAt: Date.now(),
      });
      writeLibrary(fresh);
      setTitle(meta?.title ?? url);
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
