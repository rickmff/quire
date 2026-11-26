import { describe, expect, it } from "vitest";
import { ringLayout, type Size } from "@/lib/ring";

const overlaps = (sizes: Size[], at: { x: number; y: number }[]) =>
  at.some((a, i) =>
    at.some(
      (b, j) =>
        j > i &&
        Math.abs(a.x - b.x) < (sizes[i].w + sizes[j].w) / 2 &&
        Math.abs(a.y - b.y) < (sizes[i].h + sizes[j].h) / 2,
    ),
  );

describe("ringLayout", () => {
  for (const n of [1, 2, 3, 5, 8, 12]) {
    it(`places ${n} labels without overlap and inside the box`, () => {
      const sizes = Array.from({ length: n }, (_, i) => ({ w: 60 + (i % 3) * 30, h: 28 }));
      const { at, box, reach } = ringLayout(sizes);
      expect(at).toHaveLength(n);
      expect(overlaps(sizes, at)).toBe(false);
      at.forEach(({ x, y }, i) => {
        expect(x - sizes[i].w / 2).toBeGreaterThanOrEqual(box.left - 0.001);
        expect(x + sizes[i].w / 2).toBeLessThanOrEqual(box.right + 0.001);
        expect(y - sizes[i].h / 2).toBeGreaterThanOrEqual(box.top - 0.001);
        expect(y + sizes[i].h / 2).toBeLessThanOrEqual(box.bottom + 0.001);
      });
      expect(reach).toBeGreaterThan(0);
    });
  }
});
