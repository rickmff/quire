"use client";

import { useEffect, useRef, useState } from "react";
import Quire from "./Quire";
import s from "./Landing.module.css";
import { FRAG, SHEETS, VERT } from "./quire3d/shader";

// What each sheet holds: a component, the library it came from, how to install it.
const CARDS = [
  ["Switch", "shadcn/ui", "npx shadcn@latest add switch"],
  ["Shimmer Button", "Magic UI", "npx shadcn@latest add @magicui/shimmer-button"],
  ["Slider", "shadcn/ui", "npx shadcn@latest add slider"],
  ["Tabs", "Aceternity UI", "npx shadcn@latest add @aceternity/tabs"],
  ["Skeleton", "shadcn/ui", "npx shadcn@latest add skeleton"],
  ["Input OTP", "shadcn/ui", "npx shadcn@latest add input-otp"],
  ["Animated List", "Magic UI", "npx shadcn@latest add @magicui/animated-list"],
];

const N = SHEETS;
const DEG = Math.PI / 180;
const YAW = 34 * DEG; // the stack, as on the brand board
const SHOW = { x: 0.02, lift: 1.3, z: 0.1, yaw: 9 * DEG, tilt: 38 * DEG }; // the sheet handed over
const HOLD = 4.2; // seconds a sheet stays up when nobody touches it
const FLOOR = -1.05;
const FOV = 12 * DEG; // half angle
const DIST = 11;
const TAN = Math.tan(FOV);
const MAX_FIT = 180; // px per world unit: the sheet never gets wider than about 370 px

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const damp = (dt: number, rate: number) => 1 - Math.exp(-dt * rate);

type Spring = { x: number; v: number };
function spring(sp: Spring, to: number, dt: number, k: number, c: number) {
  const h = dt / 2;
  for (let i = 0; i < 2; i++) {
    sp.v += (-k * (sp.x - to) - c * sp.v) * h;
    sp.x += sp.v * h;
  }
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || "shader");
  return sh;
}

/** Draws the three text lines of every sheet into one strip atlas. */
function drawLabels(font: string) {
  const W = 2048, H = 128, c = document.createElement("canvas");
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

/** Is this point of sheet i, in its own coordinates, on the component's control? */
function onControl(i: number, x: number, y: number) {
  if (i === 0) return Math.abs(x) < 0.42 && Math.abs(y) < 0.24;
  if (i === 1) return Math.abs(x) < 0.5 && Math.abs(y) < 0.18;
  if (i === 2) return Math.abs(x) < 0.68 && y > -0.24 && y < 0.3;
  if (i === 3) return Math.abs(x) < 0.62 && Math.abs(y - 0.17) < 0.13;
  if (i === 5) return Math.abs(x) < 0.64 && Math.abs(y) < 0.16;
  if (i === 6) return Math.abs(x) < 0.6 && y > -0.3 && y < 0.22;
  return false;
}

/**
 * The quire in WebGL2: seven glass sheets, each a captured component with its
 * preview, source library and install command. The stack hands one sheet over
 * at a time, the way an agent pulls one reference from the library.
 *
 * Everything on it answers the pointer. The component on the sheet works: the
 * switch flips, the slider drags, the tabs select, the OTP takes digits. Drag
 * anywhere else to leaf through the stack; the wheel and the arrow keys do too.
 */
export default function Quire3D() {
  const stageRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const canvas = ref.current, stage = stageRef.current;
    if (!canvas || !stage) return;
    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: "high-performance" });
    if (!gl) { setFallback(true); return; }

    let prog: WebGLProgram;
    try {
      prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || "link");
    } catch (err) {
      console.warn("quire: WebGL2 hero unavailable, using the CSS one.", err);
      setFallback(true);
      return;
    }
    gl.useProgram(prog);
    gl.bindVertexArray(gl.createVertexArray());
    const U = (n: string) => gl.getUniformLocation(prog, n);
    const u = {
      center: U("uCenter"), unit: U("uUnit"), time: U("uTime"), dark: U("uDark"), fov: U("uFov"), camPos: U("uCamPos"),
      cam: U("uCam"), c: U("uC"), r: U("uR"), pres: U("uPres"), g: U("uG"), hover: U("uHover"), pointer: U("uPointer"),
      light: U("uLight"), glint: U("uGlint"), floor: U("uFloorY"), intro: U("uIntro"),
    };

    // Label atlas. Blank until the font is ready, then drawn once.
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 1, 1, 0, gl.RED, gl.UNSIGNED_BYTE, new Uint8Array([0]));
    let alive = true;
    const font = getComputedStyle(document.body).fontFamily;
    const upload = () => {
      if (!alive) return;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, gl.RED, gl.UNSIGNED_BYTE, drawLabels(font));
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      // The text is seen at a slant, so plain trilinear would pick the blurry mip
      // for the short axis. Anisotropic filtering keeps it sharp along both.
      const af = gl.getExtension("EXT_texture_filter_anisotropic");
      if (af) gl.texParameterf(gl.TEXTURE_2D, af.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(af.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };
    Promise.all([document.fonts.load(`500 74px ${font}`), document.fonts.load(`400 64px ${font}`)]).then(upload, upload);

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scheme = matchMedia("(prefers-color-scheme: dark)");
    let dark = scheme.matches ? 1 : 0;

    // The canvas covers the page, so sheets can travel anywhere. The quire itself
    // is sized to the stage box, up to a fixed limit.
    const view = { cx: 0, cy: 0, fit: 100 }; // CSS px; fit is px per world unit
    // Render scale, in device pixels per CSS pixel. Below 1.5x the screen is too
    // coarse for the sheet's text and edges, so render at twice the screen and let
    // the browser average each 2x2 block back down: real supersampling. If frames
    // run slow, drop the supersampling first, then resolution, a step at a time.
    const native = devicePixelRatio || 1;
    const scales: number[] = [];
    for (const v of [native < 1.5 ? native * 2 : Math.min(native, 2), Math.min(native, 2), 1.5, 1.125, 1])
      if (!scales.length || v < scales[scales.length - 1]) scales.push(v);
    let step = 0, scale = scales[0], slow = 0;
    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * scale));
      const h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      const b = stage.getBoundingClientRect(), fw = innerWidth - 24, fh = Math.max(60, b.height);
      view.fit = Math.min(fh / 2.92, fw / 2.5, MAX_FIT);
      view.cx = innerWidth / 2;
      view.cy = b.top + fh / 2;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    ro.observe(stage);
    resize();

    // Scene state, kept from the last frame so the pointer can be traced into it.
    const C = new Float32Array(N * 3), R = new Float32Array(N * 9), P = new Float32Array(N), G = new Float32Array(N * 4);
    let cam = [0, 0, 1], cr = [1, 0, 0], cu = [0, 1, 0], cf = [0, 0, -1];
    let top = -1; // the sheet handed over, or -1 while sheets are travelling

    /** Traces a pointer into the scene: which sheet it lands on, and where on that sheet. */
    const pick = (clientX: number, clientY: number) => {
      const unit = view.fit * 2 * TAN * DIST;
      const ux = ((clientX - view.cx) * 2 / unit) * TAN, uy = (-(clientY - view.cy) * 2 / unit) * TAN;
      const dx = cr[0] * ux + cu[0] * uy + cf[0], dy = cr[1] * ux + cu[1] * uy + cf[1], dz = cr[2] * ux + cu[2] * uy + cf[2];
      let hit = -1, bt = 1e9, hx = 0, hy = 0;
      for (let i = 0; i < N; i++) {
        const m = i * 9, ox = cam[0] - C[i * 3], oy = cam[1] - C[i * 3 + 1], oz = cam[2] - C[i * 3 + 2];
        const ly = R[m + 3] * ox + R[m + 4] * oy + R[m + 5] * oz, ldy = R[m + 3] * dx + R[m + 4] * dy + R[m + 5] * dz;
        const t = -ly / ldy;
        if (!(t > 0) || t >= bt) continue;
        const px = R[m] * ox + R[m + 1] * oy + R[m + 2] * oz + t * (R[m] * dx + R[m + 1] * dy + R[m + 2] * dz);
        const pz = R[m + 6] * ox + R[m + 7] * oy + R[m + 8] * oz + t * (R[m + 6] * dx + R[m + 7] * dy + R[m + 8] * dz);
        if (Math.abs(px) <= 1 && Math.abs(pz) <= 0.75) { hit = i; bt = t; hx = px; hy = -pz; }
      }
      return { hit, x: hx, y: hy };
    };

    // The turn: sheet i sits in slot (i + turn) mod N. Slots 0..N-2 are the stack,
    // slot N-1 is the sheet handed over. Leaving it, a sheet goes round the back
    // and comes in again underneath. The turn is a spring, so it can be dragged.
    const turn: Spring = { x: -1, v: 0 };
    let goal = 0, idleAt = HOLD + 2.2, clock = 0, prev = 0, raf = 0, visible = true, glintAt = -10;

    // Component state. Each one plays by itself until someone touches it.
    const c = {
      swOn: false, sw: { x: 0, v: 0 }, swAt: 0,
      btnDown: false, btnPress: 0, btnRipple: 1, btnHover: 0, btnT0: 0, btnGo: 0,
      slTo: 0.5, sl: 0.5, slGrab: 0,
      tab: 0, tabPos: { x: 0, v: 0 }, tabHover: -1, tabAt: 0,
      skX: -1.3,
      otpN: 0, otpPop: { x: 1, v: 0 }, otpAt: 0,
      toast: { x: 1, v: 0 }, toastAt: 0,
    };
    let userAt = -10;
    const pushToast = () => { if (c.toast.x > 0.5) { c.toast.x = 0; c.toast.v = 0; } };
    const otpAdd = () => {
      if (c.otpN >= 6) c.otpN = 0;
      else { c.otpN++; c.otpPop.x = 0; c.otpPop.v = 0; }
      c.otpAt = clock + (c.otpN >= 6 ? 1.7 : 0.42);
    };

    // Pointer.
    let px = 0, py = 0, tx = 0, ty = 0, near = 0, nearT = 0;
    const hov = { on: false, x: 0, y: 0, tx: 0, ty: 0, z: 0 };
    let mode: "" | "scrub" | "slider" | "button" = "";
    const drag = { x0: 0, turn0: 0, moved: false, lx: 0, lt: 0, hit: -1 };
    const setSlider = (x: number) => { c.slTo = clamp((x + 0.56) / 1.12); };
    const touch = () => { userAt = clock; idleAt = Math.max(idleAt, clock + HOLD); };

    const move = (e: PointerEvent) => {
      tx = (e.clientX / innerWidth) * 2 - 1;
      ty = (e.clientY / innerHeight) * 2 - 1;
      const sx = e.clientX - view.cx, sy = e.clientY - (view.cy + view.fit * 0.75);
      nearT = clamp(1.25 - Math.hypot(sx, sy * 1.3) / (view.fit * 1.5));
      const h = pick(e.clientX, e.clientY);
      const onTop = h.hit >= 0 && h.hit === top;
      hov.on = onTop;
      if (onTop) { hov.tx = h.x; hov.ty = h.y; }
      c.tabHover = onTop && top === 3 && onControl(3, h.x, h.y) ? clamp(Math.round(h.x / 0.39) + 1, 0, 2) : -1;
      if (mode === "slider") { if (onTop) setSlider(h.x); touch(); }
      else if (mode === "scrub") {
        const d = e.clientX - drag.x0;
        if (Math.abs(d) > 5) drag.moved = true;
        if (drag.moved) {
          const nx = drag.turn0 - d / (view.fit * 2.4), now = performance.now();
          turn.v = mix(turn.v, (nx - turn.x) / Math.max((now - drag.lt) / 1000, 0.004), 0.5);
          turn.x = nx;
          drag.lt = now;
          idleAt = clock + HOLD;
        }
      }
      canvas.style.cursor = mode === "scrub" && drag.moved ? "grabbing"
        : onTop && onControl(top, h.x, h.y) ? "pointer"
        : h.hit >= 0 ? (onTop ? "grab" : "pointer") : "";
    };

    const down = (e: PointerEvent) => {
      if (e.button) return;
      canvas.setPointerCapture(e.pointerId);
      const h = pick(e.clientX, e.clientY);
      drag.hit = h.hit;
      if (h.hit >= 0 && h.hit === top && onControl(top, h.x, h.y)) {
        touch();
        if (top === 0) c.swOn = !c.swOn;
        else if (top === 1) { c.btnDown = true; mode = "button"; return; }
        else if (top === 2) { setSlider(h.x); mode = "slider"; return; }
        else if (top === 3) c.tab = clamp(Math.round(h.x / 0.39) + 1, 0, 2);
        else if (top === 5) otpAdd();
        else if (top === 6) pushToast();
        mode = "";
        return;
      }
      mode = "scrub";
      drag.x0 = e.clientX; drag.turn0 = turn.x; drag.moved = false; drag.lt = performance.now();
    };

    const up = (e: PointerEvent) => {
      if (mode === "button") { c.btnDown = false; c.btnRipple = 0; touch(); }
      else if (mode === "scrub") {
        if (drag.moved) goal = Math.round(turn.x + clamp(turn.v * 0.22, -0.6, 0.6));
        else if (drag.hit >= 0 && drag.hit !== top) goal = Math.round(turn.x) + 1; // a tap on the stack takes the next sheet
        else if (drag.hit >= 0) glintAt = clock - 0.2; // a tap on the sheet catches the light
        idleAt = clock + HOLD;
      }
      mode = "";
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      move(e);
    };
    const leave = () => { tx = ty = nearT = 0; hov.on = false; c.tabHover = -1; };

    let wheelAt = 0;
    const wheel = (e: WheelEvent) => {
      const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(d) < 8 || clock < wheelAt) return;
      wheelAt = clock + 0.32;
      goal = Math.round(goal) + Math.sign(d);
      idleAt = clock + HOLD;
    };
    const key = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as Element | null)?.closest?.("input,textarea,[contenteditable]")) return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") { goal = Math.round(goal) + (e.key === "ArrowRight" ? 1 : -1); idleAt = clock + HOLD; }
      else if (top === 5 && /^\d$/.test(e.key)) { otpAdd(); touch(); }
      else if (top === 5 && e.key === "Backspace" && c.otpN > 0) { c.otpN--; c.otpAt = clock + 0.42; touch(); }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) { prev = now; return; }
      const dt = prev ? Math.min((now - prev) / 1000, 0.05) : 0;
      if (prev && now - prev > 30) slow++; else slow = Math.max(0, slow - 1);
      prev = now;
      if (slow > 24 && step < scales.length - 1) { scale = scales[++step]; slow = 0; resize(); }
      clock += dt;

      px += (tx - px) * damp(dt, 6);
      py += (ty - py) * damp(dt, 6);
      near += (nearT - near) * damp(dt, 6);
      dark += ((scheme.matches ? 1 : 0) - dark) * damp(dt, 8);
      hov.z += ((hov.on ? 1 : 0) - hov.z) * damp(dt, 9);
      hov.x += (hov.tx - hov.x) * damp(dt, 14);
      hov.y += (hov.ty - hov.y) * damp(dt, 14);

      // Turn the stack: by itself when idle, never under a hand.
      const settled = Math.abs(turn.x - goal) < 0.02 && Math.abs(turn.v) < 0.05;
      if (hov.on || mode) idleAt = Math.max(idleAt, clock + 1.6);
      if (!(mode === "scrub" && drag.moved)) {
        if (clock > idleAt && settled && (!reduce || goal === 0)) { goal++; idleAt = clock + HOLD + 1.4; }
        spring(turn, goal, dt, 15, 7.4);
      }
      const t = reduce ? 1.2 : clock;

      const breathe = reduce ? 0.5 : Math.sin(t * 0.9) * 0.5 + 0.5;
      const gap = 0.07 + breathe * 0.014 + near * 0.085;
      const fan = near * 2.4 * DEG;
      const bob = reduce ? 0 : Math.sin(t * 0.7) * 0.018;
      const yaw0 = YAW + px * 7 * DEG;
      const y0 = -0.5 - ((N - 2) * gap) / 2 + bob;
      const yTop = y0 + (N - 2) * gap;
      const showY = yTop + SHOW.lift + bob * 0.6;
      const showYaw = SHOW.yaw + px * 6 * DEG + hov.z * hov.x * 7 * DEG + (reduce ? 0 : Math.sin(t * 0.55) * 1.2 * DEG);
      const showTilt = SHOW.tilt - py * 4 * DEG - hov.z * hov.y * 7 * DEG + (reduce ? 0 : Math.sin(t * 0.8 + 1) * 1.1 * DEG);
      const stackYaw = (slot: number) => yaw0 + (slot - (N - 2) / 2) * fan;

      let best = 0.2, was = top;
      top = -1;
      for (let i = 0; i < N; i++) {
        const q = (((i + turn.x) % N) + N) % N;
        let x = 0, y = 0, z = 0, yaw = 0, tilt = 0, pres = 0;
        if (q <= N - 2) {
          y = y0 + q * gap;
          yaw = stackYaw(q);
        } else if (q <= N - 1) {
          const v = q - (N - 2), e = sm(0, 1, v);
          x = SHOW.x * e; z = SHOW.z * e;
          y = mix(yTop, showY, e);
          yaw = mix(stackYaw(N - 2), showYaw, e);
          tilt = showTilt * sm(0.1, 1, v);
          pres = sm(0.3, 0.95, v);
        } else {
          const v = q - (N - 1), fall = sm(0.16, 0.74, v), back = Math.sin(Math.PI * v) * 1.85;
          yaw = mix(showYaw, stackYaw(0), sm(0, 0.5, v));
          x = SHOW.x * (1 - fall) - Math.sin(YAW) * back;
          z = SHOW.z * (1 - fall) - Math.cos(YAW) * back;
          y = mix(showY, y0, fall);
          tilt = showTilt * (1 - sm(0, 0.42, v)) - Math.sin(Math.PI * v) * 9 * DEG;
          pres = 1 - sm(0, 0.32, v);
        }
        const cy = Math.cos(yaw), sy = Math.sin(yaw), ct = Math.cos(tilt), st = Math.sin(tilt);
        // R = Ry(yaw) * Rx(tilt), column-major.
        R.set([cy, 0, -sy, st * sy, ct, st * cy, ct * sy, -st, ct * cy], i * 9);
        C.set([x, y, z], i * 3);
        P[i] = pres;
        if (pres > best) { best = pres; top = i; }
      }
      if (top !== was && top >= 0) {
        // A new sheet is up: one sweep of light, and its component starts over.
        glintAt = clock + 0.15;
        c.swAt = clock + 1.1; c.tabAt = clock + 1.2; c.otpAt = clock + 0.8; c.toastAt = clock + 0.9; c.btnT0 = clock - 0.1;
        hov.on = false;
      }

      // Components.
      const auto = !reduce && clock - userAt > 3;
      if (auto && top === 0 && clock > c.swAt) { c.swOn = !c.swOn; c.swAt = clock + 1.9; }
      spring(c.sw, c.swOn ? 1 : 0, dt, 260, 17);
      if (auto && top === 1) {
        const f = ((clock - c.btnT0) % 2.6) / 2.6;
        c.btnGo = sm(0, 0.36, f) - sm(0.72, 1, f);
        c.btnPress = sm(0.4, 0.45, f) - sm(0.53, 0.62, f);
        c.btnRipple = f < 0.45 ? 1 : (f - 0.45) / 0.45;
      } else {
        c.btnGo += (0 - c.btnGo) * damp(dt, 10);
        c.btnPress += ((c.btnDown ? 1 : 0) - c.btnPress) * damp(dt, 26);
        c.btnRipple = Math.min(1, c.btnRipple + dt / 0.7);
      }
      c.btnHover += ((hov.on && top === 1 && onControl(1, hov.tx, hov.ty) ? 1 : 0) - c.btnHover) * damp(dt, 14);
      if (auto && top === 2) c.slTo = sm(0, 1, 0.5 + 0.5 * Math.sin(clock * 0.95)) * 0.84 + 0.08;
      c.sl += (c.slTo - c.sl) * damp(dt, mode === "slider" ? 30 : 12);
      c.slGrab += ((mode === "slider" ? 1 : 0) - c.slGrab) * damp(dt, 16);
      if (auto && top === 3 && clock > c.tabAt) { c.tab = (c.tab + 1) % 3; c.tabAt = clock + 1.7; }
      spring(c.tabPos, c.tab, dt, 210, 18);
      const band = hov.on && top === 4 ? hov.x - hov.y * 0.35 : reduce ? 9 : mix(-1.3, 1.3, (clock * 0.5) % 1);
      c.skX = hov.on && top === 4 ? c.skX + (band - c.skX) * damp(dt, 12) : band;
      if (top === 5 && clock > c.otpAt && (auto || c.otpN >= 6)) otpAdd();
      spring(c.otpPop, 1, dt, 320, 17);
      if (auto && top === 6 && clock > c.toastAt) { pushToast(); c.toastAt = clock + 2.1; }
      spring(c.toast, 1, dt, 150, 15);
      G.set([
        c.sw.x, clamp(Math.abs(c.sw.v) * 0.011, 0, 0.07), 0, 0,
        c.btnPress, c.btnRipple, c.btnHover, c.btnGo,
        c.sl, c.slGrab, 0, 0,
        c.tabPos.x, c.tabHover, 0, 0,
        c.skX, 0, 0, 0,
        c.otpN, c.otpPop.x, c.otpN >= 6 ? 1 : 0, 0,
        c.toast.x, 0, 0, 0,
      ]);

      // Camera: 34 degrees above the horizon, nudged by the pointer.
      const el = (34 + py * 4) * DEG, az = -px * 5 * DEG;
      cam = [Math.sin(az) * Math.cos(el) * DIST, Math.sin(el) * DIST + 0.2, Math.cos(az) * Math.cos(el) * DIST];
      let f = [-cam[0], 0.2 - cam[1], -cam[2]];
      const fl = Math.hypot(f[0], f[1], f[2]);
      f = [f[0] / fl, f[1] / fl, f[2] / fl];
      const rl = Math.hypot(f[2], f[0]);
      const r = [-f[2] / rl, 0, f[0] / rl]; // cross(f, up)
      const upv = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
      cr = r; cu = upv; cf = f;

      const lx = -0.35 + px * 0.5, ly = 0.9, lz = 0.45 - py * 0.3, ll = Math.hypot(lx, ly, lz);

      // Shade only the pixels the quire can reach: the sheets, and the floor under them.
      const W = canvas.width, H = canvas.height;
      const unit = view.fit * 2 * TAN * DIST * scale, ccx = view.cx * scale, ccy = H - view.cy * scale;
      let x0 = W, y0p = H, x1 = 0, y1 = 0;
      const see = (wx: number, wy: number, wz: number) => {
        const vx = wx - cam[0], vy = wy - cam[1], vz = wz - cam[2];
        const d = vx * f[0] + vy * f[1] + vz * f[2];
        const sx = ((vx * r[0] + vz * r[2]) / d / TAN) * unit * 0.5 + ccx;
        const sy = ((vx * upv[0] + vy * upv[1] + vz * upv[2]) / d / TAN) * unit * 0.5 + ccy;
        x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0p = Math.min(y0p, sy); y1 = Math.max(y1, sy);
      };
      for (let i = 0; i < N; i++) {
        const sx = C[i * 3], syy = C[i * 3 + 1], sz = C[i * 3 + 2], m = i * 9;
        for (let k = 0; k < 4; k++) {
          const a = k & 1 ? 1 : -1, b = k & 2 ? 0.75 : -0.75;
          const wx = sx + R[m] * a + R[m + 6] * b, wy = syy + R[m + 1] * a + R[m + 7] * b, wz = sz + R[m + 2] * a + R[m + 8] * b;
          see(wx, wy, wz);
          const g = 0.35 + 0.5 * Math.max(syy - FLOOR, 0);
          see(sx + (wx - sx) * (1 + g), FLOOR, sz + (wz - sz) * (1 + g));
        }
      }
      const bx = Math.max(0, Math.floor(x0) - 4), by = Math.max(0, Math.floor(y0p) - 4);
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(0, 0, W, H);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.scissor(bx, by, Math.max(0, Math.min(W, Math.ceil(x1) + 4) - bx), Math.max(0, Math.min(H, Math.ceil(y1) + 4) - by));
      gl.viewport(0, 0, W, H);
      gl.uniform2f(u.center, ccx, ccy);
      gl.uniform1f(u.unit, unit);
      gl.uniform1f(u.time, t);
      gl.uniform1f(u.dark, dark);
      gl.uniform1f(u.fov, TAN);
      gl.uniform3fv(u.camPos, cam);
      gl.uniformMatrix3fv(u.cam, false, [...r, ...upv, ...f]);
      gl.uniform3fv(u.c, C);
      gl.uniformMatrix3fv(u.r, false, R);
      gl.uniform1fv(u.pres, P);
      gl.uniform4fv(u.g, G);
      gl.uniform3f(u.hover, hov.x, hov.y, hov.z);
      gl.uniform2f(u.pointer, px, py);
      gl.uniform3f(u.light, lx / ll, ly / ll, lz / ll);
      gl.uniform1f(u.glint, reduce ? 9 : -2 + 4.2 * clamp((clock - glintAt) / 1.1));
      gl.uniform1f(u.floor, FLOOR);
      gl.uniform1f(u.intro, reduce ? 1 : sm(0, 0.9, clock));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const vis = () => { visible = !document.hidden; };
    const lost = (e: Event) => { e.preventDefault(); setFallback(true); };

    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("pointerleave", leave);
    canvas.addEventListener("wheel", wheel, { passive: true });
    canvas.addEventListener("webglcontextlost", lost);
    addEventListener("keydown", key);
    addEventListener("resize", resize);
    document.addEventListener("visibilitychange", vis);
    raf = requestAnimationFrame(frame);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("wheel", wheel);
      canvas.removeEventListener("webglcontextlost", lost);
      removeEventListener("keydown", key);
      removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  return (
    <div ref={stageRef} className={s.stage} aria-hidden="true">
      {fallback ? <Quire /> : <canvas ref={ref} className={s.canvas} />}
    </div>
  );
}
