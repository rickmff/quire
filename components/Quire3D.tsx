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
const HOLD = 3.4, MOVE = 1.7; // seconds
const FLOOR = -1.05;
const FOV = 12 * DEG; // half angle

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const sm = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

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

/**
 * The quire in WebGL2: seven glass sheets, each a captured component with its
 * preview, source library and install command. The stack turns one sheet over
 * to the viewer at a time, the way an agent pulls one reference from the library.
 */
export default function Quire3D() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
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
      res: U("uRes"), time: U("uTime"), dark: U("uDark"), fov: U("uFov"), camPos: U("uCamPos"), cam: U("uCam"),
      c: U("uC"), r: U("uR"), pres: U("uPres"), pointer: U("uPointer"), light: U("uLight"), glint: U("uGlint"),
      floor: U("uFloorY"), intro: U("uIntro"),
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
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };
    Promise.all([document.fonts.load(`500 74px ${font}`), document.fonts.load(`400 64px ${font}`)]).then(upload, upload);

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scheme = matchMedia("(prefers-color-scheme: dark)");
    let dark = scheme.matches ? 1 : 0;

    // Resolution follows the box, and backs off if the GPU cannot hold the frame rate.
    let scale = Math.min(devicePixelRatio || 1, 2), slow = 0;
    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * scale));
      const h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    let tx = 0, ty = 0, px = 0, py = 0, nearT = 0, near = 0;
    const move = (e: PointerEvent) => {
      tx = (e.clientX / innerWidth) * 2 - 1;
      ty = (e.clientY / innerHeight) * 2 - 1;
      const b = canvas.getBoundingClientRect();
      const dx = (e.clientX - (b.left + b.width / 2)) / b.width;
      const dy = (e.clientY - (b.top + b.height / 2)) / b.height;
      nearT = clamp(1 - Math.hypot(dx, dy) / 0.62);
    };
    const leave = () => { tx = ty = nearT = 0; };

    // The turn: sheet i sits in slot (i + turn) mod N. Slots 0..N-2 are the stack,
    // slot N-1 is the sheet handed over. Leaving it, a sheet goes round the back
    // and comes in again underneath.
    let step = -1, moveAt = 0.35, arrived = -10, clock = 0, prev = 0, raf = 0, visible = true;
    const next = () => { if (clock >= moveAt + MOVE) moveAt = clock; };
    const down = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest?.("a,button")) return;
      next();
    };

    const C = new Float32Array(N * 3), R = new Float32Array(N * 9), P = new Float32Array(N);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) { prev = now; return; }
      const dt = prev ? Math.min((now - prev) / 1000, 0.05) : 0;
      if (prev && now - prev > 30) slow++; else slow = Math.max(0, slow - 1);
      prev = now;
      if (slow > 24 && scale > 0.75) { scale = Math.max(0.75, scale * 0.75); slow = 0; resize(); }
      clock += dt;

      const k = 1 - Math.exp(-dt * 6);
      px += (tx - px) * k;
      py += (ty - py) * k;
      near += (nearT - near) * k;
      dark += ((scheme.matches ? 1 : 0) - dark) * (1 - Math.exp(-dt * 8));

      let prog01 = clamp((clock - moveAt) / MOVE);
      if (prog01 >= 1) {
        step++;
        arrived = moveAt + MOVE;
        moveAt = reduce ? Infinity : arrived + HOLD;
        prog01 = 0;
      }
      const turn = step + inOut(prog01);
      const t = reduce ? 1.2 : clock;

      const breathe = reduce ? 0.5 : Math.sin(t * 0.9) * 0.5 + 0.5;
      const gap = 0.07 + breathe * 0.014 + near * 0.085;
      const fan = near * 2.4 * DEG;
      const bob = reduce ? 0 : Math.sin(t * 0.7) * 0.018;
      const yaw0 = YAW + px * 7 * DEG;
      const y0 = -0.5 - ((N - 2) * gap) / 2 + bob;
      const yTop = y0 + (N - 2) * gap;
      const showY = yTop + SHOW.lift + bob * 0.6;
      const showYaw = SHOW.yaw + px * 9 * DEG + (reduce ? 0 : Math.sin(t * 0.55) * 1.2 * DEG);
      const showTilt = SHOW.tilt - py * 6 * DEG + (reduce ? 0 : Math.sin(t * 0.8 + 1) * 1.1 * DEG);
      const stackYaw = (slot: number) => yaw0 + (slot - (N - 2) / 2) * fan;

      for (let i = 0; i < N; i++) {
        const q = (((i + turn) % N) + N) % N;
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
      }

      // Camera: 34 degrees above the horizon, nudged by the pointer.
      const el = (34 + py * 4) * DEG, az = -px * 5 * DEG, dist = 11;
      const cam = [Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist + 0.2, Math.cos(az) * Math.cos(el) * dist];
      const target = [0, 0.2, 0];
      let f = [target[0] - cam[0], target[1] - cam[1], target[2] - cam[2]];
      const fl = Math.hypot(f[0], f[1], f[2]);
      f = [f[0] / fl, f[1] / fl, f[2] / fl];
      let r = [-f[2], 0, f[0]]; // cross(f, up)
      const rl = Math.hypot(r[0], r[2]);
      r = [r[0] / rl, 0, r[2] / rl];
      const up = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];

      const lx = -0.35 + px * 0.5, ly = 0.9, lz = 0.45 - py * 0.3, ll = Math.hypot(lx, ly, lz);

      // Shade only the pixels the quire can reach: the sheets, and the floor under them.
      const W = canvas.width, H = canvas.height, unit = Math.min(H, W / 1.3), tanF = Math.tan(FOV);
      let x0 = W, y0p = H, x1 = 0, y1 = 0;
      const see = (wx: number, wy: number, wz: number) => {
        const vx = wx - cam[0], vy = wy - cam[1], vz = wz - cam[2];
        const d = vx * f[0] + vy * f[1] + vz * f[2];
        const sx = ((vx * r[0] + vz * r[2]) / d / tanF * unit + W) / 2;
        const sy = ((vx * up[0] + vy * up[1] + vz * up[2]) / d / tanF * unit + H) / 2;
        x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0p = Math.min(y0p, sy); y1 = Math.max(y1, sy);
      };
      for (let i = 0; i < N; i++) {
        const cx = C[i * 3], cyy = C[i * 3 + 1], cz = C[i * 3 + 2], m = i * 9;
        for (let k = 0; k < 4; k++) {
          const a = k & 1 ? 1 : -1, b = k & 2 ? 0.75 : -0.75;
          const wx = cx + R[m] * a + R[m + 6] * b, wy = cyy + R[m + 1] * a + R[m + 7] * b, wz = cz + R[m + 2] * a + R[m + 8] * b;
          see(wx, wy, wz);
          const g = 0.35 + 0.5 * Math.max(cyy - FLOOR, 0);
          see(cx + (wx - cx) * (1 + g), FLOOR, cz + (wz - cz) * (1 + g));
        }
      }
      const bx = Math.max(0, Math.floor(x0) - 4), by = Math.max(0, Math.floor(y0p) - 4);
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(0, 0, W, H);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.scissor(bx, by, Math.max(0, Math.min(W, Math.ceil(x1) + 4) - bx), Math.max(0, Math.min(H, Math.ceil(y1) + 4) - by));
      gl.viewport(0, 0, W, H);
      gl.uniform2f(u.res, canvas.width, canvas.height);
      gl.uniform1f(u.time, t);
      gl.uniform1f(u.dark, dark);
      gl.uniform1f(u.fov, Math.tan(FOV));
      gl.uniform3fv(u.camPos, cam);
      gl.uniformMatrix3fv(u.cam, false, [...r, ...up, ...f]);
      gl.uniform3fv(u.c, C);
      gl.uniformMatrix3fv(u.r, false, R);
      gl.uniform1fv(u.pres, P);
      gl.uniform2f(u.pointer, px, py);
      gl.uniform3f(u.light, lx / ll, ly / ll, lz / ll);
      gl.uniform1f(u.glint, reduce ? 9 : -2 + 4.2 * clamp((clock - arrived + 0.25) / 1.1));
      gl.uniform1f(u.floor, FLOOR);
      gl.uniform1f(u.intro, reduce ? 1 : sm(0, 0.9, clock));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting && !document.hidden; });
    io.observe(canvas);
    const vis = () => { visible = !document.hidden; };
    const lost = (e: Event) => { e.preventDefault(); setFallback(true); };

    addEventListener("pointermove", move, { passive: true });
    addEventListener("pointerdown", down, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", vis);
    canvas.addEventListener("webglcontextlost", lost);
    raf = requestAnimationFrame(frame);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      removeEventListener("pointermove", move);
      removeEventListener("pointerdown", down);
      document.documentElement.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", vis);
      canvas.removeEventListener("webglcontextlost", lost);
    };
  }, []);

  if (fallback) return <Quire />;
  return (
    <div className={s.stage} aria-hidden="true">
      <canvas ref={ref} className={s.canvas} />
    </div>
  );
}
