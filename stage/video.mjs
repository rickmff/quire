// Quire stage video: short clips of each demo in real time, with the same framing and zoom
// as the stills. Frames are grabbed as fast as Chrome paints them and resampled to 30 fps.
// Clips that barely move, or that Chrome cannot paint at 18 fps or more, are skipped:
// the still is the better preview there. The still's pose (hover, click...) is replayed
// on a timeline unless poses.json gives video.steps.
//   node video.mjs <library> <port> <outDir> [name ...]
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
const { chromium } = createRequire(import.meta.url)("playwright");
const [lib, port, OUT, ...only] = process.argv.slice(2);
const FPS = 30, W = 1280, H = 800;
const MIRROR = existsSync("mirror/manifest.json") ? JSON.parse(readFileSync("mirror/manifest.json", "utf8")) : null;
const report = JSON.parse(readFileSync(`${OUT}/report.json`, "utf8"));
const POSES = existsSync("poses.json") ? JSON.parse(readFileSync("poses.json", "utf8")) : {};
const demos = JSON.parse(readFileSync(`app-${lib}/demos.json`, "utf8")).filter((d) => d.demo && (!only.length || only.includes(d.name)));
const vreport = existsSync(`${OUT}/video.json`) ? JSON.parse(readFileSync(`${OUT}/video.json`, "utf8")) : {};

// Turn a still's pose into timed video steps: waits become gaps (capped), actions keep order.
function timeline(cfg) {
  if (cfg.video?.steps) return cfg.video.steps;
  const out = [];
  let t = 600;
  for (const s of cfg.steps ?? []) {
    if (s.wait) t += Math.min(s.wait, 1200);
    const { wait, at, eval: _e, ...act } = s;
    if (!Object.keys(act).length) continue;
    out.push({ ...act, pos: at, at: t });
    t += 350;
  }
  return out;
}


async function record(browser, d, theme) {
  const r = report[`${d.name}|${theme}`];
  if (!r?.frame) return { skip: "no still" };
  const cfg = POSES[`${lib}/${d.name}`] ?? {};
  const f = r.frame, zoom = r.zoom ?? 1;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, colorScheme: theme, reducedMotion: "no-preference" });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  if (MIRROR) await p.route(/^https?:\/\/(?!localhost)/, async (route) => {
    const hit = MIRROR[route.request().url()];
    if (hit) return route.fulfill({ path: `mirror/${hit.file}`, contentType: hit.type, headers: { "access-control-allow-origin": "*" } });
    return route.continue();
  });

  const dir = `${OUT}/.frames-${d.name}-${theme}`;
  rmSync(dir, { recursive: true, force: true });
  rmSync(`${OUT}/${d.name}-${theme}.mp4`, { force: true });
  mkdirSync(dir, { recursive: true });
  try {
    await p.goto(`http://localhost:${port}/?c=${encodeURIComponent(d.name)}&theme=${theme}${cfg.w ? `&w=${cfg.w}` : ""}${cfg.h ? `&h=${cfg.h}` : ""}${cfg.fill ? "&fill=1" : ""}${cfg.box ? "&box=1" : ""}${zoom !== 1 ? `&zoom=${zoom}` : ""}`, { waitUntil: "load", timeout: 60000 });
    await p.waitForFunction(() => window.__ready, null, { timeout: 30000 });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    const steps = timeline(cfg);
    const seconds = cfg.video?.seconds ?? Math.max(4, ((steps.at(-1)?.at ?? 0) + 2500) / 1000);
    await p.waitForTimeout(cfg.video?.lead ?? 0);
    // Real-time capture: grab frames as fast as Chrome paints them, then resample to FPS.
    const grabbed = [];
    const t0 = Date.now();
    let busy = true;
    const actions = (async () => {
      for (const s of steps) {
        await p.waitForTimeout(Math.max(0, (s.at ?? 0) - (Date.now() - t0)));
        if (s.hover) { const b = await p.locator(s.hover).first().boundingBox(); if (b) await p.mouse.move(b.x + b.width * (s.pos?.[0] ?? 0.5), b.y + b.height * (s.pos?.[1] ?? 0.5), { steps: s.steps ?? 20 }); }
        if (s.move) await p.mouse.move(s.move[0], s.move[1], { steps: s.steps ?? 20 });
        if (s.click) await p.locator(s.click).first().click({ timeout: 2000, force: true, noWaitAfter: true }).catch(() => {});
        if (s.rightclick) { const b = await p.locator(s.rightclick).first().boundingBox(); if (b) await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2, { button: "right" }); }
        if (s.scroll) await p.mouse.wheel(0, s.scroll);
        if (s.type) await p.keyboard.type(s.type, { delay: 90 });
        if (s.press) await p.keyboard.press(s.press);
      }
    })();
    while (Date.now() - t0 < seconds * 1000) {
      const shot = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 92, optimizeForSpeed: true, clip: { x: f.x, y: f.y, width: f.width, height: f.height, scale: W / f.width / 2 } });
      grabbed.push({ t: Date.now() - t0, data: shot.data });
    }
    await actions;
    const fps = grabbed.length / seconds;
    const force = cfg.video?.force || process.env.FORCE;
    if (fps < 18 && !force) return { skip: "slow", fps: +fps.toFixed(1) };
    const total = Math.floor(seconds * FPS);
    const frames = [];
    let k = 0;
    for (let i = 0; i < total; i++) {
      while (k + 1 < grabbed.length && grabbed[k + 1].t <= (i * 1000) / FPS) k++;
      const file = `${dir}/${String(i).padStart(4, "0")}.jpg`;
      writeFileSync(file, Buffer.from(grabbed[k].data, "base64"));
      frames.push(file);
    }
    // Share of pixels that change between sampled frames; thin moving lines count too.
    const raw = async (fp) => sharp(fp).resize(320, 200).greyscale().raw().toBuffer();
    const idx = [0, 0.2, 0.4, 0.6, 0.8, 0.99].map((k) => Math.floor(k * (total - 1)));
    const bufs = await Promise.all(idx.map((i) => raw(frames[i])));
    let motion = 0;
    for (let k = 1; k < bufs.length; k++) { let n = 0; for (let i = 0; i < bufs[k].length; i++) if (Math.abs(bufs[k][i] - bufs[k - 1][i]) > 10) n++; motion = Math.max(motion, n / bufs[k].length); }
    if (motion < 0.0008 && !force) return { skip: "static", motion };
    const out = `${OUT}/${d.name}-${theme}.mp4`;
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", `${dir}/%04d.jpg`, "-vf", `scale=${W}:${H}:flags=lanczos,format=yuv420p`, "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-movflags", "+faststart", "-an", out]);
    return { file: out, motion: +motion.toFixed(4), fps: +fps.toFixed(1) };
  } finally {
    await ctx.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const browser = await chromium.launch();
const queue = demos.flatMap((d) => ["light", "dark"].map((theme) => ({ d, theme })));
await Promise.all(Array.from({ length: Number(process.env.JOBS || 3) }, async () => {
  while (queue.length) {
    const { d, theme } = queue.shift();
    try { const r = await record(browser, d, theme); vreport[`${d.name}|${theme}`] = r; console.log(d.name, theme, JSON.stringify(r)); }
    catch (e) { vreport[`${d.name}|${theme}`] = { error: String(e.message).slice(0, 200) }; console.log(d.name, theme, "FAILED", String(e.message).split("\n")[0]); }
  }
}));
writeFileSync(`${OUT}/video.json`, JSON.stringify(vreport, null, 1));
await browser.close();
