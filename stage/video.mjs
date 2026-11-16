import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, renameSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
const { chromium } = createRequire(import.meta.url)("playwright");
const [lib, port, OUT, ...only] = process.argv.slice(2);
const FPS = 30,
  W = 1280,
  H = 800;
const MIRROR = existsSync("mirror/manifest.json") ? JSON.parse(readFileSync("mirror/manifest.json", "utf8")) : null;
const report = JSON.parse(readFileSync(`${OUT}/report.json`, "utf8"));
const POSES = existsSync("poses.json") ? JSON.parse(readFileSync("poses.json", "utf8")) : {};
const demos = JSON.parse(readFileSync(`app-${lib}/demos.json`, "utf8")).filter(
  (d) => d.demo && (!only.length || only.includes(d.name)),
);
const VREPORT = `${OUT}/${process.env.MEASURE ? "measure" : "video"}.json`;
const vreport = existsSync(VREPORT) ? JSON.parse(readFileSync(VREPORT, "utf8")) : {};
const POINTER = new Set(["hover", "to", "path", "click", "rightclick", "drag", "down", "leave", "dblclick"]);
const MEASURE = Boolean(process.env.MEASURE);

function timeline(cfg) {
  if (cfg.video?.steps) return cfg.video.steps;
  const out = [];
  let t = 500;
  for (const s of cfg.steps ?? []) {
    if (s.wait) t += Math.min(s.wait, 1000);
    const { wait, at, eval: _e, ...act } = s;
    if (!Object.keys(act).length) continue;
    out.push({ ...act, pos: at, at: t });
    t += 700;
  }
  return out;
}

const slowClock = (k) => `(() => {
  const k = ${k}, pn = performance.now.bind(performance), p0 = pn(), dn = Date.now, d0 = dn();
  performance.now = () => p0 + (pn() - p0) / k;
  Date.now = () => d0 + (dn() - d0) / k;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf((t) => cb(p0 + (t - p0) / k));
  const st = window.setTimeout.bind(window), si = window.setInterval.bind(window);
  window.setTimeout = (f, ms, ...a) => st(f, (ms || 0) * k, ...a);
  window.setInterval = (f, ms, ...a) => si(f, (ms || 0) * k, ...a);
})()`;

async function record(browser, d, theme, slow) {
  const r = report[`${d.name}|${theme}`];
  if (!r?.frame) return { skip: "no still" };
  const cfg = POSES[`${lib}/${d.name}`] ?? {};
  const v = cfg.video ?? {};
  const k = slow ?? v.slow ?? 1;
  const f = r.frame,
    zoom = r.zoom ?? 1;
  const steps = timeline(cfg);
  const pointer = v.cursor ?? steps.some((s) => Object.keys(s).some((x) => POINTER.has(x)));
  const cursor = pointer && !MEASURE ? Math.round(Math.max(12, (20 * f.width) / 640)) : 0;
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: MEASURE ? 1 : 2,
    colorScheme: theme,
    reducedMotion: "no-preference",
  });
  if (k !== 1) await ctx.addInitScript(slowClock(k));
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  if (MIRROR)
    await p.route(/^https?:\/\/(?!localhost)/, async (route) => {
      if (/^https:\/\/www\.youtube\.com\/embed\//.test(route.request().url()))
        return route.fulfill({ contentType: "text/html", body: "<body style='margin:0;background:#000'></body>" });
      const hit = MIRROR[route.request().url()];
      if (hit)
        return route.fulfill({
          path: `mirror/${hit.file}`,
          contentType: hit.type,
          headers: { "access-control-allow-origin": "*" },
        });
      return route.continue();
    });

  const dir = `${OUT}/.frames-${d.name}-${theme}`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  try {
    const q = `c=${encodeURIComponent(d.name)}&theme=${theme}${cfg.w ? `&w=${cfg.w}` : ""}${cfg.h ? `&h=${cfg.h}` : ""}${cfg.fill ? "&fill=1" : ""}${cfg.box ? "&box=1" : ""}${cfg.freetheme ? "&freetheme=1" : ""}${zoom !== 1 ? `&zoom=${zoom}` : ""}${cursor ? `&cursor=${cursor}` : ""}`;
    await p.goto(`http://localhost:${port}/?${q}`, { waitUntil: "load", timeout: 60000 });
    if (k !== 1)
      await cdp.send("Animation.enable").then(() => cdp.send("Animation.setPlaybackRate", { playbackRate: 1 / k }));
    await p.waitForFunction(() => window.__ready, null, { timeout: 30000 * k });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(400 * k);

    const at = ([fx, fy]) => [
      Math.min(1279, Math.max(0, f.x + fx * f.width)),
      Math.min(799, Math.max(0, f.y + fy * f.height)),
    ];
    const mouse = { x: 0, y: 0 };
    const jump = async (x, y) => {
      mouse.x = x;
      mouse.y = y;
      await p.mouse.move(x, y);
    };
    if (pointer) await jump(...at(v.start ?? [0.82, 1.15]));
    if (v.remount !== false) {
      await p.evaluate(() => window.__remount?.());
      await p.waitForFunction(() => window.__ready, null, { timeout: 10000 * k });
    }
    await p.waitForTimeout((v.lead ?? 0) * k);

    const glide = async (x, y, ms = 650) => {
      const x0 = mouse.x,
        y0 = mouse.y,
        g0 = Date.now(),
        dur = ms * k;
      for (;;) {
        const e = Math.min(1, (Date.now() - g0) / dur),
          s = e < 0.5 ? 2 * e * e : 1 - (-2 * e + 2) ** 2 / 2;
        await p.mouse.move(x0 + (x - x0) * s, y0 + (y - y0) * s);
        if (e >= 1) break;
        await p.waitForTimeout(16 * k);
      }
      mouse.x = x;
      mouse.y = y;
    };
    const point = async (s, key) => {
      const target = s[key];
      if (Array.isArray(target)) return at(target);
      const b = await p
        .locator(target)
        .nth(s.nth ?? 0)
        .boundingBox();
      return b ? [b.x + b.width * (s.pos?.[0] ?? 0.5), b.y + b.height * (s.pos?.[1] ?? 0.5)] : null;
    };
    const press = async (button = "left") => {
      await p.mouse.down({ button });
      await p.waitForTimeout(90 * k);
      await p.mouse.up({ button });
    };

    const seconds = v.seconds ?? Math.max(4, ((steps.at(-1)?.at ?? 0) + 1800) / 1000);
    const grabbed = [];
    const t0 = Date.now();
    const actions = (async () => {
      for (const s of steps) {
        await p.waitForTimeout(Math.max(0, (s.at ?? 0) * k - (Date.now() - t0)));
        const ms = s.ms;
        if (process.env.DEBUG) console.log(d.name, theme, Object.keys(s).join(","), (Date.now() - t0) / k);
        if (s.hover) {
          const pt = await point(s, "hover");
          if (pt) await glide(...pt, ms);
        }
        if (s.to) await glide(...at(s.to), ms);
        if (s.path) for (const pt of s.path) await glide(...at(pt), (ms ?? 1800) / s.path.length);
        if (s.click || s.rightclick || s.dblclick) {
          const key = s.click ? "click" : s.rightclick ? "rightclick" : "dblclick";
          const pt = s[key] === true ? [mouse.x, mouse.y] : await point(s, key);
          if (pt) {
            await glide(...pt, ms ?? 500);
            await press(s.rightclick ? "right" : "left");
            if (s.dblclick) {
              await p.waitForTimeout(60 * k);
              await press();
            }
          }
        }
        if (s.drag) {
          const from = await point({ ...s, drag: s.drag.from }, "drag");
          if (from) {
            await glide(...from, 450);
            await p.mouse.down();
            await glide(...at(s.drag.to), ms ?? 900);
            await p.waitForTimeout(80 * k);
            await p.mouse.up();
          }
        }
        if (s.down) await p.mouse.down();
        if (s.up) await p.mouse.up();
        if (s.scroll) {
          const dur = (ms ?? 600) * k,
            g0 = Date.now();
          let done = 0;
          for (;;) {
            const e = Math.min(1, (Date.now() - g0) / dur),
              dy = Math.round(s.scroll * e - done);
            if (dy) {
              await p.mouse.wheel(0, dy);
              done += dy;
            }
            if (e >= 1) break;
            await p.waitForTimeout(40 * k);
          }
        }
        if (s.type) await p.keyboard.type(s.type, { delay: 90 * k });
        if (s.press) await p.keyboard.press(s.press);
        if (s.eval) await p.evaluate(s.eval);
        if (s.leave) {
          await glide(...at(Array.isArray(s.leave) ? s.leave : [0.82, 1.15]), ms ?? 600);
          await p.evaluate(() => {
            const c = document.getElementById("stage-cursor");
            if (c) c.style.opacity = "0";
          });
        }
      }
    })();
    const pageScroll = steps.some((s) => s.scroll || s.eval);
    if (MEASURE) {
      const samples = [];
      while (Date.now() - t0 < seconds * 1000 * k) {
        const t = Math.round((Date.now() - t0) / k);
        const png = Buffer.from((await cdp.send("Page.captureScreenshot", { format: "png" })).data, "base64");
        const r = await sharp(png)
          .trim({ threshold: 4 })
          .toBuffer({ resolveWithObject: true })
          .catch(() => null);
        if (r) {
          const x = -r.info.trimOffsetLeft,
            y = -r.info.trimOffsetTop;
          samples.push([t, x, y, x + r.info.width, y + r.info.height]);
        }
        await p.waitForTimeout(60 * k);
      }
      await actions;
      const first = steps.find((s) =>
        Object.keys(s).some((x) => POINTER.has(x) || ["type", "press", "scroll", "eval"].includes(x)),
      );
      return { samples, first: first ? (first.at ?? 0) : null, frame: f, pageScroll };
    }
    const clip = { x: f.x, y: f.y, width: f.width, height: f.height, scale: W / f.width / 2 };
    while (Date.now() - t0 < seconds * 1000 * k) {
      const shot = await cdp.send("Page.captureScreenshot", {
        format: "jpeg",
        quality: 92,
        optimizeForSpeed: true,
        ...(pageScroll ? {} : { clip }),
      });
      grabbed.push({ t: (Date.now() - t0) / k, data: shot.data });
    }
    await actions;
    const fps = grabbed.length / seconds;
    const force = v.force || process.env.FORCE;
    if (fps < (k > 1 ? 12 : 18) && !force) return { skip: "slow", fps: +fps.toFixed(1), k };
    const total = Math.floor(seconds * FPS);
    const frames = [];
    let j = 0;
    for (let i = 0; i < total; i++) {
      while (j + 1 < grabbed.length && grabbed[j + 1].t <= (i * 1000) / FPS) j++;
      frames.push(grabbed[j].data);
    }
    if (v.pingpong) frames.push(...frames.slice(1, -1).reverse());
    const dpr = pageScroll ? (await sharp(Buffer.from(frames[0], "base64")).metadata()).width / 1280 : 1;
    const cut = { left: Math.round(f.x * dpr), top: Math.round(f.y * dpr) };
    Object.assign(cut, {
      width: Math.min(Math.round(f.width * dpr), Math.round(1280 * dpr) - cut.left),
      height: Math.min(Math.round(f.height * dpr), Math.round(800 * dpr) - cut.top),
    });
    for (const [i, data] of frames.entries()) {
      const file = `${dir}/${String(i).padStart(4, "0")}.jpg`;
      if (pageScroll)
        await sharp(Buffer.from(data, "base64")).extract(cut).resize(W, H).jpeg({ quality: 92 }).toFile(file);
      else writeFileSync(file, Buffer.from(data, "base64"));
    }
    const raw = async (i) =>
      sharp(`${dir}/${String(i).padStart(4, "0")}.jpg`)
        .resize(320, 200)
        .greyscale()
        .raw()
        .toBuffer();
    const idx = [0, 0.2, 0.4, 0.6, 0.8, 0.99].map((x) => Math.floor(x * (frames.length - 1)));
    const bufs = await Promise.all(idx.map(raw));
    let motion = 0;
    for (let x = 1; x < bufs.length; x++) {
      let n = 0;
      for (let i = 0; i < bufs[x].length; i++) if (Math.abs(bufs[x][i] - bufs[x - 1][i]) > 10) n++;
      motion = Math.max(motion, n / bufs[x].length);
    }
    if (motion < 0.0008 && !force) return { skip: "static", motion };
    const out = `${OUT}/${d.name}-${theme}.mp4`;
    for (const [crf, w, h] of [
      [20, W, H],
      [26, 960, 600],
      [30, 960, 600],
    ]) {
      execFileSync("ffmpeg", [
        "-y",
        "-loglevel",
        "error",
        "-framerate",
        String(FPS),
        "-i",
        `${dir}/%04d.jpg`,
        "-vf",
        `scale=${w}:${h}:flags=lanczos,format=yuv420p`,
        "-c:v",
        "libx264",
        "-preset",
        "slow",
        "-crf",
        String(crf),
        "-movflags",
        "+faststart",
        "-an",
        `${dir}/clip.mp4`,
      ]);
      if (statSync(`${dir}/clip.mp4`).size <= 600 * 1024) break;
    }
    renameSync(`${dir}/clip.mp4`, out);
    return {
      file: out,
      motion: +motion.toFixed(4),
      fps: +fps.toFixed(1),
      ...(k !== 1 ? { k } : {}),
      seconds: frames.length / FPS,
    };
  } finally {
    await ctx.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const browser = await chromium.launch({ args: ["--enable-gpu-rasterization", "--ignore-gpu-blocklist"] });
const queue = demos.flatMap((d) => ["light", "dark"].map((theme) => ({ d, theme })));
await Promise.all(
  Array.from({ length: Number(process.env.JOBS || 3) }, async () => {
    while (queue.length) {
      const { d, theme } = queue.shift();
      try {
        let r = await record(browser, d, theme);
        if (MEASURE) {
          vreport[`${d.name}|${theme}`] = r;
          console.log(d.name, theme, r.samples?.length ?? JSON.stringify(r));
          continue;
        }
        if (r.skip === "slow") r = await record(browser, d, theme, Math.min(12, Math.ceil(22 / Math.max(r.fps, 1))));
        vreport[`${d.name}|${theme}`] = r;
        console.log(d.name, theme, JSON.stringify(r));
      } catch (e) {
        vreport[`${d.name}|${theme}`] = { error: String(e.message).slice(0, 200) };
        console.log(d.name, theme, "FAILED", String(e.message).split("\n")[0]);
      }
    }
  }),
);
writeFileSync(`${OUT}/${MEASURE ? "measure" : "video"}.json`, JSON.stringify(vreport, null, 1));
await browser.close();
