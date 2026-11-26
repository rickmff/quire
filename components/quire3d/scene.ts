import { SHEETS } from "./shader";

export const CARDS = [
  ["Switch", "shadcn/ui", "npx shadcn@latest add switch"],
  ["Shimmer Button", "Magic UI", "npx shadcn@latest add @magicui/shimmer-button"],
  ["Slider", "shadcn/ui", "npx shadcn@latest add slider"],
  ["Tabs", "Aceternity UI", "npx shadcn@latest add @aceternity/tabs"],
  ["Skeleton", "shadcn/ui", "npx shadcn@latest add skeleton"],
  ["Input OTP", "shadcn/ui", "npx shadcn@latest add input-otp"],
  ["Animated List", "Magic UI", "npx shadcn@latest add @magicui/animated-list"],
];

export const N = SHEETS;
export const DEG = Math.PI / 180;
export const YAW = 34 * DEG;
export const SHOW = { x: 0.02, lift: 1.3, z: 0.1, yaw: 9 * DEG, tilt: 38 * DEG };
export const HOLD = 4.2;
export const FLOOR = -1.05;
export const FOV = 12 * DEG;
export const DIST = 11;
export const TAN = Math.tan(FOV);
export const MAX_FIT = 180;
export const LEAVE = 0.62;
export const PILE_Y = -0.3;
export const PILE_GAP = 0.018;
export const pileTurn = (p: number) => (((p * 37) % 7) - 3) * 0.9 * DEG;

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const sm = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const damp = (dt: number, rate: number) => 1 - Math.exp(-dt * rate);

export type Spring = { x: number; v: number };
export function spring(sp: Spring, to: number, dt: number, k: number, c: number) {
  const h = dt / 2;
  for (let i = 0; i < 2; i++) {
    sp.v += (-k * (sp.x - to) - c * sp.v) * h;
    sp.x += sp.v * h;
  }
}

export function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || "shader");
  return sh;
}

export function drawLabels(font: string) {
  const W = 2048,
    H = 128,
    c = document.createElement("canvas");
  c.width = W;
  c.height = H * N * 2;
  const g = c.getContext("2d")!;
  g.textBaseline = "middle";
  CARDS.forEach(([name, lib, cmd], i) => {
    const y = i * 2 * H + H / 2;
    g.font = `500 74px ${font}`;
    g.textAlign = "left";
    g.fillStyle = "rgb(235 0 0)";
    g.fillText(name, 4, y);
    g.fillStyle = "rgb(140 0 0)";
    g.textAlign = "right";
    g.fillText(lib, W - 4, y);
    g.textAlign = "left";
    g.font = `400 64px ${font}`;
    g.fillText(`$ ${cmd}`, 4, y + H);
  });
  return c;
}

export function onControl(i: number, x: number, y: number) {
  if (i === 0) return Math.abs(x) < 0.42 && Math.abs(y) < 0.24;
  if (i === 1) return Math.abs(x) < 0.5 && Math.abs(y) < 0.18;
  if (i === 2) return Math.abs(x) < 0.68 && y > -0.24 && y < 0.3;
  if (i === 3) return Math.abs(x) < 0.62 && Math.abs(y - 0.17) < 0.13;
  if (i === 5) return Math.abs(x) < 0.64 && Math.abs(y) < 0.16;
  if (i === 6) return Math.abs(x) < 0.6 && y > -0.3 && y < 0.22;
  return false;
}
