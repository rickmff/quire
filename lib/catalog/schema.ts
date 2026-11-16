export type CatalogComponent = {
  id: string;
  library: string;
  name: string;
  title: string;
  description?: string;
  category?: string;
  type: string;
  triggers: string[];
  tech: string[];
  dependencies?: string[];
  docs: string;
  item?: string;
  install?: string;
  repo?: string;
  files?: string[];
  preview?: string;
  previewDark?: string;
  video?: string;
  videoDark?: string;
  live?: LiveDemo;
  note?: string;
  site?: string;
};

export type LiveDemo = {
  src: string;
  frame: number[];
  view: number[];
  srcDark?: string;
  frameDark?: number[];
  variants?: LiveVariant[];
};

export type LiveVariant = {
  key: string;
  label: string;
  value?: string | number | boolean;
  options: { value: string | number | boolean; label: string }[];
};

export type CatalogLibrary = {
  id: string;
  name: string;
  url: string;
  blurb: string;
  repo?: string;
  count: number;
};

export type Catalog = {
  version: 1;
  generatedAt: string;
  libraries: CatalogLibrary[];
  components: CatalogComponent[];
};

export type SyncedLibrary = {
  version: 1;
  mode: "curated" | "scratch";
  sources: string[];
  items: CatalogComponent[];
  updatedAt: number;
};
