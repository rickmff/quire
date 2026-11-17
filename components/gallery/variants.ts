import { type LiveVariant } from "@/lib/catalog/schema";
import type { Picked } from "@/components/gallery/types";

export function variantQuery(groups: LiveVariant[] | undefined, picked: Picked = {}) {
  const q = new URLSearchParams();
  const props: Picked = {};
  for (const g of groups ?? []) {
    if (!(g.key in picked)) continue;
    if (g.key === "v") {
      if (picked.v) q.set("v", String(picked.v));
    }
    else props[g.key] = picked[g.key];
  }
  if (Object.keys(props).length) q.set("p", JSON.stringify(props));
  const s = q.toString();
  return s ? `&${s}` : "";
}
export const current = (g: LiveVariant, picked: Picked) => (g.key in picked ? picked[g.key] : (g.value ?? ""));
