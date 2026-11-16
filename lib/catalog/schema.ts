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
  note?: string; // the user's note, personal items only
  site?: string; // display name of the source, personal items only
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
