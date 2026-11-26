"use client";

import { useEffect, useRef, useState } from "react";
import Quire from "./Quire";
import s from "./Landing.module.css";
import { FRAG, VERT } from "./quire3d/shader";
import {
  N,
  DEG,
  YAW,
  SHOW,
  HOLD,
  FLOOR,
  DIST,
  TAN,
  MAX_FIT,
  LEAVE,
  PILE_Y,
  PILE_GAP,
  pileTurn,
  clamp,
  sm,
  mix,
  damp,
  spring,
  compile,
  drawLabels,
  onControl,
  type Spring,
} from "./quire3d/scene";

export default function Quire3D() {
  const stageRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const canvas = ref.current,
      stage = stageRef.current;
    if (!canvas || !stage) return;
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      powerPreference: "high-performance",
    });
    if (!gl) {
      setFallback(true);
      return;
    }

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
      center: U("uCenter"),
      unit: U("uUnit"),
      time: U("uTime"),
      fov: U("uFov"),
      camPos: U("uCamPos"),
      cam: U("uCam"),
      c: U("uC"),
      r: U("uR"),
      pres: U("uPres"),
      g: U("uG"),
      hover: U("uHover"),
      pointer: U("uPointer"),
      light: U("uLight"),
      glint: U("uGlint"),
      floor: U("uFloorY"),
      floorK: U("uFloorK"),
      intro: U("uIntro"),
    };

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
      const af = gl.getExtension("EXT_texture_filter_anisotropic");
      if (af)
        gl.texParameterf(
          gl.TEXTURE_2D,
          af.TEXTURE_MAX_ANISOTROPY_EXT,
          Math.min(8, gl.getParameter(af.MAX_TEXTURE_MAX_ANISOTROPY_EXT)),
        );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };
    Promise.all([document.fonts.load(`500 74px ${font}`), document.fonts.load(`400 64px ${font}`)]).then(
      upload,
      upload,
    );

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const view = { cx: 0, cy: 0, fit: 100 };
    const native = devicePixelRatio || 1;
    const scales: number[] = [];
    for (const v of [native < 1.5 ? native * 2 : Math.min(native, 2), Math.min(native, 2), 1.5, 1.125, 1])
      if (!scales.length || v < scales[scales.length - 1]) scales.push(v);
    let step = 0,
      scale = scales[0],
      slow = 0;
    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * scale));
      const h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const b = stage.getBoundingClientRect(),
        fw = innerWidth - 24,
        fh = Math.max(60, b.height);
      view.fit = Math.min(fh / 2.92, fw / 2.5, MAX_FIT);
      view.cx = innerWidth / 2;
      view.cy = b.top + fh / 2 - fh * 0.08;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    ro.observe(stage);
    resize();

    const C = new Float32Array(N * 3),
      R = new Float32Array(N * 9),
      P = new Float32Array(N),
      G = new Float32Array(N * 4);
    let cam = [0, 0, 1],
      cr = [1, 0, 0],
      cu = [0, 1, 0],
      cf = [0, 0, -1];
    let top = -1;

    const pick = (clientX: number, clientY: number) => {
      const unit = view.fit * 2 * TAN * DIST;
      const ux = (((clientX - view.cx) * 2) / unit) * TAN,
        uy = ((-(clientY - view.cy) * 2) / unit) * TAN;
      const dx = cr[0] * ux + cu[0] * uy + cf[0],
        dy = cr[1] * ux + cu[1] * uy + cf[1],
        dz = cr[2] * ux + cu[2] * uy + cf[2];
      let hit = -1,
        bt = 1e9,
        hx = 0,
        hy = 0;
      for (let i = 0; i < N; i++) {
        const m = i * 9,
          ox = cam[0] - C[i * 3],
          oy = cam[1] - C[i * 3 + 1],
          oz = cam[2] - C[i * 3 + 2];
        const ly = R[m + 3] * ox + R[m + 4] * oy + R[m + 5] * oz,
          ldy = R[m + 3] * dx + R[m + 4] * dy + R[m + 5] * dz;
        const t = -ly / ldy;
        if (!(t > 0) || t >= bt) continue;
        const px = R[m] * ox + R[m + 1] * oy + R[m + 2] * oz + t * (R[m] * dx + R[m + 1] * dy + R[m + 2] * dz);
        const pz = R[m + 6] * ox + R[m + 7] * oy + R[m + 8] * oz + t * (R[m + 6] * dx + R[m + 7] * dy + R[m + 8] * dz);
        if (Math.abs(px) <= 1 && Math.abs(pz) <= 0.75) {
          hit = i;
          bt = t;
          hx = px;
          hy = -pz;
        }
      }
      return { hit, x: hx, y: hy };
    };

    const turn: Spring = { x: -1, v: 0 };
    let leaveAt = -1,
      leaveSlot = 0,
      leftSent = false;
    let goal = 0,
      idleAt = HOLD + 2.2,
      clock = 0,
      prev = 0,
      raf = 0,
      visible = true,
      glintAt = -10;

    const c = {
      swOn: false,
      sw: { x: 0, v: 0 },
      swAt: 0,
      btnDown: false,
      btnPress: 0,
      btnRipple: 1,
      btnHover: 0,
      btnT0: 0,
      btnGo: 0,
      slTo: 0.5,
      sl: 0.5,
      slGrab: 0,
      tab: 0,
      tabPos: { x: 0, v: 0 },
      tabHover: -1,
      tabAt: 0,
      skX: -1.3,
      otpN: 0,
      otpPop: { x: 1, v: 0 },
      otpAt: 0,
      toast: { x: 1, v: 0 },
      toastAt: 0,
    };
    let userAt = -10;
    const pushToast = () => {
      if (c.toast.x > 0.5) {
        c.toast.x = 0;
        c.toast.v = 0;
      }
    };
    const otpAdd = () => {
      if (c.otpN >= 6) c.otpN = 0;
      else {
        c.otpN++;
        c.otpPop.x = 0;
        c.otpPop.v = 0;
      }
      c.otpAt = clock + (c.otpN >= 6 ? 1.7 : 0.42);
    };

    let px = 0,
      py = 0,
      tx = 0,
      ty = 0,
      near = 0,
      nearT = 0;
    const hov = { on: false, x: 0, y: 0, tx: 0, ty: 0, z: 0 };
    let mode: "" | "scrub" | "slider" | "button" = "";
    const drag = { x0: 0, turn0: 0, moved: false, lx: 0, lt: 0, hit: -1 };
    const setSlider = (x: number) => {
      c.slTo = clamp((x + 0.56) / 1.12);
    };
    const touch = () => {
      userAt = clock;
      idleAt = Math.max(idleAt, clock + HOLD);
    };

    const move = (e: PointerEvent) => {
      if (leaveAt >= 0) return;
      tx = (e.clientX / innerWidth) * 2 - 1;
      ty = (e.clientY / innerHeight) * 2 - 1;
      const sx = e.clientX - view.cx,
        sy = e.clientY - (view.cy + view.fit * 0.75);
      nearT = clamp(1.25 - Math.hypot(sx, sy * 1.3) / (view.fit * 1.5));
      const h = pick(e.clientX, e.clientY);
      const onTop = h.hit >= 0 && h.hit === top;
      hov.on = onTop;
      if (onTop) {
        hov.tx = h.x;
        hov.ty = h.y;
      }
      c.tabHover = onTop && top === 3 && onControl(3, h.x, h.y) ? clamp(Math.round(h.x / 0.39) + 1, 0, 2) : -1;
      if (mode === "slider") {
        if (onTop) setSlider(h.x);
        touch();
      } else if (mode === "scrub") {
        const d = e.clientX - drag.x0;
        if (Math.abs(d) > 5) drag.moved = true;
        if (drag.moved) {
          const nx = drag.turn0 - d / (view.fit * 2.4),
            now = performance.now();
          turn.v = mix(turn.v, (nx - turn.x) / Math.max((now - drag.lt) / 1000, 0.004), 0.5);
          turn.x = nx;
          drag.lt = now;
          idleAt = clock + HOLD;
        }
      }
      canvas.style.cursor =
        mode === "scrub" && drag.moved
          ? "grabbing"
          : onTop && onControl(top, h.x, h.y)
            ? "pointer"
            : h.hit >= 0
              ? onTop
                ? "grab"
                : "pointer"
              : "";
    };

    const down = (e: PointerEvent) => {
      if (e.button || leaveAt >= 0) return;
      canvas.setPointerCapture(e.pointerId);
      const h = pick(e.clientX, e.clientY);
      drag.hit = h.hit;
      if (h.hit >= 0 && h.hit === top && onControl(top, h.x, h.y)) {
        touch();
        if (top === 0) c.swOn = !c.swOn;
        else if (top === 1) {
          c.btnDown = true;
          mode = "button";
          return;
        } else if (top === 2) {
          setSlider(h.x);
          mode = "slider";
          return;
        } else if (top === 3) c.tab = clamp(Math.round(h.x / 0.39) + 1, 0, 2);
        else if (top === 5) otpAdd();
        else if (top === 6) pushToast();
        mode = "";
        return;
      }
      mode = "scrub";
      drag.x0 = e.clientX;
      drag.turn0 = turn.x;
      drag.moved = false;
      drag.lt = performance.now();
    };

    const up = (e: PointerEvent) => {
      if (leaveAt >= 0) return;
      if (mode === "button") {
        c.btnDown = false;
        c.btnRipple = 0;
        touch();
      } else if (mode === "scrub") {
        if (drag.moved) goal = Math.round(turn.x + clamp(turn.v * 0.22, -0.6, 0.6));
        else if (drag.hit >= 0 && drag.hit !== top) goal = Math.round(turn.x) + 1;
        else if (drag.hit >= 0) glintAt = clock - 0.2;
        idleAt = clock + HOLD;
      }
      mode = "";
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      move(e);
    };
    const leave = () => {
      tx = ty = nearT = 0;
      hov.on = false;
      c.tabHover = -1;
    };

    let wheelAt = 0;
    const wheel = (e: WheelEvent) => {
      if (leaveAt >= 0) return;
      const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(d) < 8 || clock < wheelAt) return;
      wheelAt = clock + 0.32;
      goal = Math.round(goal) + Math.sign(d);
      idleAt = clock + HOLD;
    };
    const key = (e: KeyboardEvent) => {
      if (leaveAt >= 0) return;
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        (e.target as Element | null)?.closest?.("input,textarea,[contenteditable]")
      )
        return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        goal = Math.round(goal) + (e.key === "ArrowRight" ? 1 : -1);
        idleAt = clock + HOLD;
      } else if (top === 5 && /^\d$/.test(e.key)) {
        otpAdd();
        touch();
      } else if (top === 5 && e.key === "Backspace" && c.otpN > 0) {
        c.otpN--;
        c.otpAt = clock + 0.42;
        touch();
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) {
        prev = now;
        return;
      }
      const dt = prev ? Math.min((now - prev) / 1000, 0.05) : 0;
      if (prev && now - prev > 30) slow++;
      else slow = Math.max(0, slow - 1);
      prev = now;
      if (slow > 24 && step < scales.length - 1) {
        scale = scales[++step];
        slow = 0;
        resize();
      }
      clock += dt;

      px += (tx - px) * damp(dt, 6);
      py += (ty - py) * damp(dt, 6);
      near += (nearT - near) * damp(dt, 6);
      hov.z += ((hov.on ? 1 : 0) - hov.z) * damp(dt, 9);
      hov.x += (hov.tx - hov.x) * damp(dt, 14);
      hov.y += (hov.ty - hov.y) * damp(dt, 14);

      const settled = Math.abs(turn.x - goal) < 0.02 && Math.abs(turn.v) < 0.05;
      if (hov.on || mode) idleAt = Math.max(idleAt, clock + 1.6);
      if (!(mode === "scrub" && drag.moved)) {
        if (clock > idleAt && settled && (!reduce || goal === 0)) {
          goal++;
          idleAt = clock + HOLD + 1.4;
        }
        spring(turn, goal, dt, 15, 7.4);
      }
      const t = reduce ? 1.2 : clock;
      const L = leaveAt < 0 ? 0 : clamp((clock - leaveAt) / LEAVE);
      const lv = L * L * L * (L * (L * 6 - 15) + 10);
      const lvTop = sm(0, 0.8, L);

      const breathe = reduce ? 0.5 : Math.sin(t * 0.9) * 0.5 + 0.5;
      const gap = 0.07 + breathe * 0.014 + near * 0.085;
      const fan = near * 2.4 * DEG;
      const bob = reduce ? 0 : Math.sin(t * 0.7) * 0.018;
      const yaw0 = YAW + px * 7 * DEG;
      const y0 = -0.5 - ((N - 2) * gap) / 2 + bob;
      const yTop = y0 + (N - 2) * gap;
      const showY = yTop + SHOW.lift + bob * 0.6;
      const showYaw = SHOW.yaw + px * 6 * DEG + hov.z * hov.x * 7 * DEG + (reduce ? 0 : Math.sin(t * 0.55) * 1.2 * DEG);
      const showTilt =
        SHOW.tilt - py * 4 * DEG - hov.z * hov.y * 7 * DEG + (reduce ? 0 : Math.sin(t * 0.8 + 1) * 1.1 * DEG);
      const stackYaw = (slot: number) => yaw0 + (slot - (N - 2) / 2) * fan;

      let best = 0.2;
      const was = top;
      top = -1;
      for (let i = 0; i < N; i++) {
        const q = (((i + turn.x) % N) + N) % N;
        let x = 0,
          y = 0,
          z = 0,
          yaw = 0,
          tilt = 0,
          pres = 0;
        if (q <= N - 2) {
          y = y0 + q * gap;
          yaw = stackYaw(q);
        } else if (q <= N - 1) {
          const v = q - (N - 2),
            e = sm(0, 1, v);
          x = SHOW.x * e;
          z = SHOW.z * e;
          y = mix(yTop, showY, e);
          yaw = mix(stackYaw(N - 2), showYaw, e);
          tilt = showTilt * sm(0.1, 1, v);
          pres = sm(0.3, 0.95, v);
        } else {
          const v = q - (N - 1),
            fall = sm(0.16, 0.74, v),
            back = Math.sin(Math.PI * v) * 1.85;
          yaw = mix(showYaw, stackYaw(0), sm(0, 0.5, v));
          x = SHOW.x * (1 - fall) - Math.sin(YAW) * back;
          z = SHOW.z * (1 - fall) - Math.cos(YAW) * back;
          y = mix(showY, y0, fall);
          tilt = showTilt * (1 - sm(0, 0.42, v)) - Math.sin(Math.PI * v) * 9 * DEG;
          pres = 1 - sm(0, 0.32, v);
        }
        if (L > 0) {
          const slot = (((i + leaveSlot) % N) + N) % N,
            p = slot >= N - 1 ? 0 : N - 1 - slot,
            k = p === 0 ? lvTop : lv;
          x = mix(x, 0, k);
          y = mix(y, PILE_Y - p * PILE_GAP, k);
          z = mix(z, (p * 1.5) / view.fit, k);
          yaw = mix(yaw, -pileTurn(p), k);
          tilt = mix(tilt, 0, k);
          pres *= 1 - sm(0, 0.5, L);
        }
        const cy = Math.cos(yaw),
          sy = Math.sin(yaw),
          ct = Math.cos(tilt),
          st = Math.sin(tilt);
        R.set([cy, 0, -sy, st * sy, ct, st * cy, ct * sy, -st, ct * cy], i * 9);
        C.set([x, y, z], i * 3);
        P[i] = pres;
        if (pres > best) {
          best = pres;
          top = i;
        }
      }
      if (top !== was && top >= 0) {
        glintAt = clock + 0.15;
        c.swAt = clock + 1.1;
        c.tabAt = clock + 1.2;
        c.otpAt = clock + 0.8;
        c.toastAt = clock + 0.9;
        c.btnT0 = clock - 0.1;
        hov.on = false;
      }

      const auto = !reduce && clock - userAt > 3;
      if (auto && top === 0 && clock > c.swAt) {
        c.swOn = !c.swOn;
        c.swAt = clock + 1.9;
      }
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
      if (auto && top === 3 && clock > c.tabAt) {
        c.tab = (c.tab + 1) % 3;
        c.tabAt = clock + 1.7;
      }
      spring(c.tabPos, c.tab, dt, 210, 18);
      const band = hov.on && top === 4 ? hov.x - hov.y * 0.35 : reduce ? 9 : mix(-1.3, 1.3, (clock * 0.5) % 1);
      c.skX = hov.on && top === 4 ? c.skX + (band - c.skX) * damp(dt, 12) : band;
      if (top === 5 && clock > c.otpAt && (auto || c.otpN >= 6)) otpAdd();
      spring(c.otpPop, 1, dt, 320, 17);
      if (auto && top === 6 && clock > c.toastAt) {
        pushToast();
        c.toastAt = clock + 2.1;
      }
      spring(c.toast, 1, dt, 150, 15);
      G.set([
        c.sw.x,
        clamp(Math.abs(c.sw.v) * 0.011, 0, 0.07),
        0,
        0,
        c.btnPress,
        c.btnRipple,
        c.btnHover,
        c.btnGo,
        c.sl,
        c.slGrab,
        0,
        0,
        c.tabPos.x,
        c.tabHover,
        0,
        0,
        c.skX,
        0,
        0,
        0,
        c.otpN,
        c.otpPop.x,
        c.otpN >= 6 ? 1 : 0,
        0,
        c.toast.x,
        0,
        0,
        0,
      ]);

      const el = mix((34 + py * 4) * DEG, 89.9 * DEG, lv),
        az = mix(-px * 5 * DEG, 0, lv),
        ay = mix(0.2, PILE_Y, lv);
      cam = [Math.sin(az) * Math.cos(el) * DIST, Math.sin(el) * DIST + ay, Math.cos(az) * Math.cos(el) * DIST];
      let f = [-cam[0], ay - cam[1], -cam[2]];
      const fl = Math.hypot(f[0], f[1], f[2]);
      f = [f[0] / fl, f[1] / fl, f[2] / fl];
      const rl = Math.hypot(f[2], f[0]);
      const r = [-f[2] / rl, 0, f[0] / rl];
      const upv = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
      cr = r;
      cu = upv;
      cf = f;

      const lx = -0.35 + px * 0.5,
        ly = 0.9,
        lz = 0.45 - py * 0.3,
        ll = Math.hypot(lx, ly, lz);

      const W = canvas.width,
        H = canvas.height;
      const unit = view.fit * 2 * TAN * DIST * scale,
        ccx = view.cx * scale,
        ccy = H - view.cy * scale;
      let x0 = W,
        y0p = H,
        x1 = 0,
        y1 = 0;
      const see = (wx: number, wy: number, wz: number) => {
        const vx = wx - cam[0],
          vy = wy - cam[1],
          vz = wz - cam[2];
        const d = vx * f[0] + vy * f[1] + vz * f[2];
        const sx = ((vx * r[0] + vz * r[2]) / d / TAN) * unit * 0.5 + ccx;
        const sy = ((vx * upv[0] + vy * upv[1] + vz * upv[2]) / d / TAN) * unit * 0.5 + ccy;
        x0 = Math.min(x0, sx);
        x1 = Math.max(x1, sx);
        y0p = Math.min(y0p, sy);
        y1 = Math.max(y1, sy);
      };
      for (let i = 0; i < N; i++) {
        const sx = C[i * 3],
          syy = C[i * 3 + 1],
          sz = C[i * 3 + 2],
          m = i * 9;
        for (let k = 0; k < 4; k++) {
          const a = k & 1 ? 1 : -1,
            b = k & 2 ? 0.75 : -0.75;
          const wx = sx + R[m] * a + R[m + 6] * b,
            wy = syy + R[m + 1] * a + R[m + 7] * b,
            wz = sz + R[m + 2] * a + R[m + 8] * b;
          see(wx, wy, wz);
          const g = 0.35 + 0.5 * Math.max(syy - FLOOR, 0);
          see(sx + (wx - sx) * (1 + g), FLOOR, sz + (wz - sz) * (1 + g));
        }
      }
      const bx = Math.max(0, Math.floor(x0) - 4),
        by = Math.max(0, Math.floor(y0p) - 4);
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(0, 0, W, H);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.scissor(
        bx,
        by,
        Math.max(0, Math.min(W, Math.ceil(x1) + 4) - bx),
        Math.max(0, Math.min(H, Math.ceil(y1) + 4) - by),
      );
      gl.viewport(0, 0, W, H);
      gl.uniform2f(u.center, ccx, ccy);
      gl.uniform1f(u.unit, unit);
      gl.uniform1f(u.time, t);
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
      gl.uniform1f(u.floorK, 1 - lv);
      gl.uniform1f(u.intro, reduce ? 1 : sm(0, 0.9, clock));
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (L >= 1 && !leftSent) {
        leftSent = true;
        const sheets: { from: number; cx: number; cy: number }[] = [];
        for (let i = 0; i < N; i++) {
          const slot = (((i + leaveSlot) % N) + N) % N,
            p = slot >= N - 1 ? 0 : N - 1 - slot;
          const off = i * 0.061 + t * 0.04 + px * 0.25;
          const qx = px * 0.3 - 0.16 * Math.sin(t * 0.31 + i * 1.3),
            qy = py * 0.22 - 0.16 * Math.cos(-t * 0.27 + i * 2.1);
          sheets[p] = { from: (((90 - off * 360) % 360) + 360) % 360, cx: 50 + qx * 50, cy: 50 + (qy / 1.5) * 100 };
        }
        dispatchEvent(new CustomEvent("quire:left", { detail: { x: view.cx, y: view.cy, w: view.fit * 2, sheets } }));
      }
    };

    const leaveFor = (e: Event) => {
      if (reduce || leaveAt >= 0 || !visible) return;
      (e as CustomEvent<{ accept?: () => void }>).detail?.accept?.();
      leaveAt = clock;
      leaveSlot = Math.round(turn.x);
      goal = leaveSlot;
      idleAt = Infinity;
      tx = ty = nearT = 0;
      hov.on = false;
      c.tabHover = -1;
      mode = "";
      canvas.style.cursor = "";
    };

    const vis = () => {
      visible = !document.hidden;
    };
    const lost = (e: Event) => {
      e.preventDefault();
      setFallback(true);
    };

    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("pointerleave", leave);
    canvas.addEventListener("wheel", wheel, { passive: true });
    canvas.addEventListener("webglcontextlost", lost);
    addEventListener("keydown", key);
    addEventListener("quire:leave", leaveFor);
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
      removeEventListener("quire:leave", leaveFor);
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
