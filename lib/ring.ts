export type Size = { w: number; h: number };
export type RingLayout = {
  at: { x: number; y: number }[];
  box: { left: number; right: number; top: number; bottom: number };
  reach: number;
};

const GAP = 6;
const MIN_R = 40;
const MAX_R = 150;

function place(sizes: Size[], r: number) {
  const n = sizes.length;
  return sizes.map(({ w, h }, i) => {
    const a = -Math.PI / 2 + (i / n) * 2 * Math.PI;
    const cos = Math.cos(a),
      sin = Math.sin(a);
    return { x: r * cos + (w / 2) * cos, y: r * sin + (h / 2) * sin };
  });
}

function stack(sizes: Size[]) {
  const n = sizes.length,
    right = Math.ceil(n / 2);
  const row = Math.max(...sizes.map((s) => s.h)) + GAP;
  const r = Math.max(MIN_R, (right * row) / 2);
  return sizes.map(({ w }, i) => {
    const side = i < right ? 1 : -1;
    const k = side > 0 ? right : n - right;
    const j = side > 0 ? i : n - 1 - i;
    const y = (j - (k - 1) / 2) * row;
    const x = GAP / 2 + Math.sqrt(Math.max(0, r * r - y * y));
    return { x: side * (x + w / 2), y };
  });
}

function clear(sizes: Size[], at: { x: number; y: number }[]) {
  for (let i = 0; i < at.length; i++)
    for (let j = i + 1; j < at.length; j++) {
      const dx = Math.abs(at[i].x - at[j].x) - (sizes[i].w + sizes[j].w) / 2;
      const dy = Math.abs(at[i].y - at[j].y) - (sizes[i].h + sizes[j].h) / 2;
      if (dx < GAP && dy < GAP) return false;
    }
  return true;
}

export function ringLayout(sizes: Size[]): RingLayout {
  let at: { x: number; y: number }[] | undefined;
  for (let r = MIN_R; r <= MAX_R && !at; r += 2) {
    const p = place(sizes, r);
    if (clear(sizes, p)) at = p;
  }
  at ??= stack(sizes);
  const box = { left: 0, right: 0, top: 0, bottom: 0 };
  let reach = MIN_R;
  at.forEach(({ x, y }, i) => {
    const { w, h } = sizes[i];
    box.left = Math.min(box.left, x - w / 2);
    box.right = Math.max(box.right, x + w / 2);
    box.top = Math.min(box.top, y - h / 2);
    box.bottom = Math.max(box.bottom, y + h / 2);
    reach = Math.max(reach, Math.hypot(Math.abs(x) + w / 2, Math.abs(y) + h / 2));
  });
  return { at, box, reach };
}
