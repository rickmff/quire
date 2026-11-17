import { OTHER, typeById } from "@/lib/types";
import { type GalleryItem } from "@/lib/useCatalog";

const SPLIT_AT = 15;
const FAMILY_LABEL: Record<string, string> = {
  Input: "Inputs",
  Overlay: "Overlays",
  Section: "Sections",
  Effect: "Effects",
};
const TYPE_LABEL: Record<string, string> = {
  "text-effect": "Text effects",
  background: "Backgrounds",
  cursor: "Cursors",
  button: "Buttons",
  card: "Cards",
};
export function groupItems(items: GalleryItem[]) {
  const byFamily = new Map<string, GalleryItem[]>();
  for (const i of items) {
    const f = typeById(i.type).family;
    byFamily.set(f, [...(byFamily.get(f) ?? []), i]);
  }
  const groups: { key: string; name: string; items: GalleryItem[] }[] = [];
  for (const [family, list] of byFamily) {
    if (list.length <= SPLIT_AT || family === OTHER.family) {
      groups.push({ key: family, name: FAMILY_LABEL[family] ?? family, items: list });
      continue;
    }
    const byType = new Map<string, GalleryItem[]>();
    for (const i of list) byType.set(i.type, [...(byType.get(i.type) ?? []), i]);
    for (const [t, l] of byType)
      groups.push({ key: `${family}/${t}`, name: TYPE_LABEL[t] ?? typeById(t).name, items: l });
  }
  return groups.sort(
    (a, b) =>
      Number(a.key === OTHER.family) - Number(b.key === OTHER.family) ||
      b.items.length - a.items.length ||
      a.name.localeCompare(b.name),
  );
}
export const groupLabel = (key: string) => {
  const [family, type] = key.split("/");
  return type ? (TYPE_LABEL[type] ?? typeById(type).name) : (FAMILY_LABEL[family] ?? family);
};
export function mix<T extends { library: string; preview?: string }>(items: T[]): T[] {
  const deal = (list: T[]) => {
    const by = new Map<string, T[]>();
    for (const i of list) by.set(i.library, [...(by.get(i.library) ?? []), i]);
    const queues = [...by.values()];
    const out: T[] = [];
    for (let n = 0; out.length < list.length; n++) for (const q of queues) if (q[n]) out.push(q[n]);
    return out;
  };
  return [...deal(items.filter((i) => i.preview)), ...deal(items.filter((i) => !i.preview))];
}
