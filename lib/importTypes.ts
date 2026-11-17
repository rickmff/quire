export type ImportItem = {
  url: string;
  title: string;
  description?: string;
  category?: string;
  install?: string;
  registry?: string;
  dependencies?: string[];
  type: string;
};

export type ImportResult = {
  site: string;
  library: string;
  source: "registry" | "links" | "sitemap";
  items: ImportItem[];
};
