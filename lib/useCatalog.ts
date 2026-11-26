"use client";

import { useEffect, useState } from "react";
import type { CatalogComponent, CatalogLibrary } from "@/lib/catalog/schema";
import { CATALOG_URL } from "@/lib/catalogUrl";

export type GalleryItem = Omit<CatalogComponent, "files" | "repo" | "dependencies"> & {
  source?: boolean;
  saved?: string;
};
export type ClientCatalog = { generatedAt: string; libraries: CatalogLibrary[]; components: GalleryItem[] };

let cache: Promise<ClientCatalog> | null = null;

export function preloadCatalog() {
  cache ??= fetch(CATALOG_URL).then((r) => r.json());
}

export function useCatalog() {
  const [data, setData] = useState<ClientCatalog | null>(null);
  useEffect(() => {
    cache ??= fetch(CATALOG_URL).then((r) => r.json());
    let alive = true;
    cache.then((d) => alive && setData(d)).catch(() => (cache = null));
    return () => {
      alive = false;
    };
  }, []);
  return data;
}

type Status = { sync: boolean; capture: boolean };
let status: Promise<Status> | null = null;
export const getStatus = () =>
  (status ??= fetch("/api/status")
    .then((r) => r.json())
    .catch(() => ({ sync: false, capture: false })));

export function useSyncAvailable() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    getStatus().then((s) => setOk(s.sync));
  }, []);
  return ok;
}

export function useCaptureAvailable() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    getStatus().then((s) => setOk(s.capture));
  }, []);
  return ok;
}
