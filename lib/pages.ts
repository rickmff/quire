import { catalog, libraryName } from "@/lib/catalog";
import type { CatalogComponent } from "@/lib/catalog/schema";
import { groupItems, groupLabel } from "@/lib/groups";
import { typeById } from "@/lib/types";
import { viewPath } from "@/lib/view";

export type GalleryPage = {
  path: string;
  title: string;
  description: string;
  items: CatalogComponent[];
};

const list = (names: string[]) =>
  names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

export const libraryNames = () => list(catalog.libraries.map((l) => l.name));

export const appDescription = () =>
  `Browse ${catalog.components.length} animated UI components from ${libraryNames()} with live previews, star the ones you keep, and copy them for your AI agent or fetch them over MCP.`;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function libraryPages(): GalleryPage[] {
  return catalog.libraries.flatMap((lib) => {
    const items = catalog.components.filter((c) => c.library === lib.id);
    if (!items.length) return [];
    const top: GalleryPage = {
      path: viewPath(`site:${lib.id}`),
      title: `${lib.name} components`,
      description:
        `${plural(items.length, "component")} from ${lib.name}, with live previews, install commands and source for your AI agent. ${lib.blurb ?? ""}`.trim(),
      items,
    };
    const groups = groupItems(items).map((g): GalleryPage => ({
      path: viewPath(`site:${lib.id}|${g.key}`),
      title: `${lib.name} ${groupLabel(g.key).toLowerCase()}`,
      description: `${groupLabel(g.key)} from ${lib.name}: ${plural(g.items.length, "component")} with live previews, install commands and source for your AI agent.`,
      items: catalog.components.filter((c) => g.items.some((i) => i.id === c.id)),
    }));
    return [top, ...groups];
  });
}

function typePages(): GalleryPage[] {
  const byType = new Map<string, CatalogComponent[]>();
  for (const c of catalog.components) byType.set(c.type, [...(byType.get(c.type) ?? []), c]);
  return [...byType]
    .filter(([id]) => id !== "other")
    .map(([id, items]) => {
      const name = typeById(id).name;
      const libs = list([...new Set(items.map(libraryName))]);
      return {
        path: viewPath(`type:${id}`),
        title: `${name} components`,
        description: `${plural(items.length, `${name.toLowerCase()} component`)} from ${libs}, with live previews, install commands and source for your AI agent.`,
        items,
      };
    });
}

export function galleryPages(): GalleryPage[] {
  const all: GalleryPage = {
    path: viewPath("libraries"),
    title: "All libraries",
    description: `Every component in the Quire catalog: ${catalog.components.length} components from ${libraryNames()}, category by category.`,
    items: catalog.components,
  };
  const seen = new Set<string>();
  return [all, ...libraryPages(), ...typePages()].filter((p) => !seen.has(p.path) && seen.add(p.path));
}

export const pageAt = (path: string) => galleryPages().find((p) => p.path === path) ?? null;
