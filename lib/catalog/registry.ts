export type RegistryFile = string | { path?: string; target?: string; content?: string; type?: string };

export type RegistryItem = {
  name: string;
  type?: string;
  access?: string;
  title?: string;
  description?: string;
  category?: string;
  categories?: string[];
  dependencies?: string[];
  registryDependencies?: string[];
  files?: RegistryFile[];
};

export type Registry = { name?: string; homepage?: string; items?: RegistryItem[] };
