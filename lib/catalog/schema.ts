// Shape of one component reference, shared by the curated catalog,
// personal libraries and the MCP.

export type CatalogComponent = {
  id: string; // "<library>/<name>"
  library: string;
  name: string;
  title: string;
  description?: string;
  category?: string; // the site's own category
  type: string; // Quire type id (lib/types.ts)
  triggers: string[]; // motion triggers (lib/motion.ts)
  tech: string[]; // animation tech found in dependencies
  dependencies?: string[];
  docs: string; // the component's page on its site
  item?: string; // live shadcn registry item (JSON with source)
  install?: string;
  repo?: string; // GitHub owner/name, for the source fallback
  files?: string[]; // source paths inside repo
  preview?: string; // image URL (light theme)
  previewDark?: string; // image URL for the dark theme
  video?: string; // short clip URL (webm or mp4), light theme
  videoDark?: string; // clip for the dark theme
  live?: LiveDemo; // the component running on the Quire stage (stage/build.sh)
  note?: string; // the user's note, personal items only
  site?: string; // display name of the source, personal items only
};

// A page of the stage built into public/stage/<library>/. It lays the demo out in a
// view-sized window; frame is the part of it the stills show ([x, y, width, height], 16:10).
export type LiveDemo = {
  src: string;
  frame: number[];
  view: number[]; // [width, height]
  srcDark?: string;
  frameDark?: number[];
  variants?: LiveVariant[]; // what the gear menu can switch the live demo to (stage/variants.mjs)
};

// One choice of a component's variants: key "v" picks another example of it (value: the
// example's name, "" for the default); any other key is a prop of the demo, set to the value.
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

// What a browser syncs to the server so the MCP can read it.
export type SyncedLibrary = {
  version: 1;
  // "curated": followed sources from the catalog plus own items.
  // "scratch": own items only, sources start empty.
  mode: "curated" | "scratch";
  sources: string[]; // catalog library ids the user follows
  items: CatalogComponent[]; // components the user added by link or extension
  updatedAt: number;
};
