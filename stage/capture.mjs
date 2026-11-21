import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import sharp from "sharp";
const { chromium } = createRequire(import.meta.url)("playwright");
const [lib, port, OUT, ...only] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const demos = JSON.parse(readFileSync(`app-${lib}/demos.json`, "utf8")).filter(
  (d) => d.demo && (!only.length || only.includes(d.name)),
);
const POSES = existsSync("poses.json") ? JSON.parse(readFileSync("poses.json", "utf8")) : {};
const D = 4,
  VW = 1280,
  VH = 800;
const FRAMES = existsSync(`frames/${lib}.json`) ? JSON.parse(readFileSync(`frames/${lib}.json`, "utf8")) : {};
const MIRROR = existsSync("mirror/manifest.json") ? JSON.parse(readFileSync("mirror/manifest.json", "utf8")) : null;

async function pose(p, steps = []) {
  for (const s of steps) {
    try {
      if (s.wait) await p.waitForTimeout(s.wait);
      if (s.hover) {
        const b = await p.locator(s.hover).first().boundingBox();
        if (b)
          await p.mouse.move(b.x + b.width * (s.at?.[0] ?? 0.5), b.y + b.height * (s.at?.[1] ?? 0.5), { steps: 8 });
      }
      if (s.move) await p.mouse.move(s.move[0], s.move[1], { steps: 12 });
      if (s.click) await p.locator(s.click).first().click({ timeout: 3000, force: true });
      if (s.rightclick) {
        const b = await p.locator(s.rightclick).first().boundingBox();
        if (b) await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2, { button: "right" });
      }
      if (s.type) await p.keyboard.type(s.type, { delay: 60 });
      if (s.press) await p.keyboard.press(s.press);
      if (s.scroll) await p.mouse.wheel(0, s.scroll);
      if (s.eval) await p.evaluate(s.eval);
    } catch (e) {
      console.log("  pose step failed", JSON.stringify(s), String(e.message).split("\n")[0]);
    }
  }
}

export function frameOf(t, cfg = {}) {
  const ox = -t.info.trimOffsetLeft / D,
    oy = -t.info.trimOffsetTop / D;
  const r = { x0: ox, y0: oy, x1: ox + t.info.width / D, y1: oy + t.info.height / D };
  const pad = cfg.pad ?? 1.28;
  let w = (r.x1 - r.x0) * pad,
    h = (r.y1 - r.y0) * pad;
  if (w / h > 1.6) h = w / 1.6;
  else w = h * 1.6;
  const min = cfg.min ?? 320;
  if (w < min) {
    w = min;
    h = min / 1.6;
  }
  if (w > VW) {
    w = VW;
    h = VH;
  }
  const cx = (r.x0 + r.x1) / 2,
    cy = (r.y0 + r.y1) / 2;
  return {
    x: Math.max(0, Math.min(VW - w, cx - w / 2)),
    y: Math.max(0, Math.min(VH - h, cy - h / 2)),
    width: w,
    height: h,
    content: r,
  };
}

const browser = await chromium.launch({ args: ["--enable-gpu-rasterization", "--ignore-gpu-blocklist"] });
const report = existsSync(`${OUT}/report.json`) ? JSON.parse(readFileSync(`${OUT}/report.json`, "utf8")) : {};
const queue = demos.map((d) => ({ d, theme: "dark" }));
async function shoot(ctx, d, theme, cfg, zoom) {
  const p = await ctx.newPage();
  const errs = [],
    blocked = [];
  p.on("pageerror", (e) => errs.push(String(e.message).slice(0, 200)));
  p.on("requestfailed", (r) => {
    if (!/favicon|localhost/.test(r.url())) {
      errs.push("net " + new URL(r.url()).host);
      blocked.push(r.url());
    }
  });
  p.on("response", (r) => {
    if (r.status() >= 400 && !/favicon/.test(r.url())) errs.push(`http ${r.status()} ${r.url().slice(0, 120)}`);
  });
  if (MIRROR)
    await p.route(/^https?:\/\/(?!localhost)/, async (route) => {
      const hit = MIRROR[route.request().url()];
      if (hit)
        return route.fulfill({
          path: `mirror/${hit.file}`,
          contentType: hit.type,
          headers: { "access-control-allow-origin": "*" },
        });
      return route.continue();
    });
  try {
    await p.goto(
      `http://localhost:${port}/?c=${encodeURIComponent(d.name)}&theme=${theme}${cfg.w ? `&w=${cfg.w}` : ""}${cfg.h ? `&h=${cfg.h}` : ""}${cfg.fill ? "&fill=1" : ""}${cfg.box ? "&box=1" : ""}${zoom !== 1 ? `&zoom=${zoom}` : ""}`,
      { waitUntil: "load", timeout: 60000 },
    );
    await p
      .waitForFunction(() => window.__ready || document.querySelector("#stage-error"), null, { timeout: 30000 })
      .catch(() => errs.push("not ready"));
    await p.evaluate(() => document.fonts.ready);
    await p.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await pose(p, cfg.steps ?? [{ wait: cfg.wait ?? 2500 }]);
    const crash = await p.evaluate(
      () =>
        document.querySelector("#stage-error")?.textContent ||
        (document.querySelector("vite-error-overlay") ? "vite overlay" : null),
    );
    if (crash) errs.push("render: " + crash.slice(0, 200));
    const full = await p.screenshot({ animations: "allow" });
    const t = await sharp(full)
      .trim({ threshold: cfg.threshold ?? 8 })
      .toBuffer({ resolveWithObject: true })
      .catch(() => null);
    return { full, t, errs, blocked };
  } finally {
    await p.close();
  }
}

async function worker() {
  while (queue.length) {
    const { d, theme } = queue.shift();
    const cfg = POSES[`${lib}/${d.name}`] ?? {};
    const ctx = await browser.newContext({
      viewport: { width: VW, height: VH },
      deviceScaleFactor: D,
      colorScheme: theme,
      reducedMotion: "no-preference",
    });
    const fixed = FRAMES[d.name];
    let zoom = fixed?.zoom ?? cfg.zoom ?? 1,
      errs = [],
      blocked = [];
    try {
      let shot;
      for (let attempt = 0; ; attempt++) {
        shot = await shoot(ctx, d, theme, cfg, zoom);
        errs = shot.errs;
        blocked = shot.blocked;
        if (!shot.t) {
          errs.push("blank");
          throw new Error("blank");
        }
        const t = shot.t,
          tw = t.info.width / D,
          th = t.info.height / D,
          top = -t.info.trimOffsetTop / D,
          left = -t.info.trimOffsetLeft / D;
        const touches = top < 2 || top + th > VH - 2 || left < 2 || left + tw > VW - 2;
        if (fixed || cfg.fullFrame || cfg.fill || cfg.zoom || !touches || tw >= VW * 0.97 || attempt >= 2) break;
        zoom = +(zoom * 0.72).toFixed(2);
      }
      const f =
        cfg.fullFrame || cfg.fill
          ? { x: 0, y: 0, width: VW, height: VH }
          : fixed
            ? { x: fixed.x, y: fixed.y, width: fixed.width, height: fixed.height, content: fixed.content }
            : frameOf(shot.t, cfg);
      const L = Math.round(f.x * D),
        T = Math.round(f.y * D);
      const png = await sharp(shot.full)
        .extract({
          left: L,
          top: T,
          width: Math.min(VW * D - L, Math.round(f.width * D)),
          height: Math.min(VH * D - T, Math.round(f.height * D)),
        })
        .toBuffer();
      const base = `${OUT}/${d.name}-${theme}`;
      await sharp(png)
        .resize(1600, 1000, { kernel: "lanczos3", fit: "fill" })
        .webp({ quality: 90, smartSubsample: true, effort: 5 })
        .toFile(base + ".webp");
      await sharp(png)
        .resize(480, 300)
        .png()
        .toFile(base + ".thumb.png");
      report[`${d.name}|${theme}`] = { frame: f, zoom, errs: [...new Set(errs)], blocked: [...new Set(blocked)] };
      console.log(
        d.name,
        theme,
        Math.round(f.width) + "x" + Math.round(f.height),
        zoom !== 1 ? "zoom " + zoom : "",
        errs.length ? [...new Set(errs)].join(" | ") : "",
      );
    } catch (e) {
      report[`${d.name}|${theme}`] = {
        error: String(e.message).slice(0, 300),
        errs: [...new Set(errs)],
        blocked: [...new Set(blocked)],
      };
      console.log(d.name, theme, "FAILED", String(e.message).split("\n")[0], [...new Set(errs)].join(" | "));
    } finally {
      await ctx.close();
    }
  }
}
await Promise.all(Array.from({ length: Number(process.env.JOBS || 3) }, worker));
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
writeFileSync(
  `${OUT}/blocked.json`,
  JSON.stringify([...new Set(Object.values(report).flatMap((r) => r.blocked ?? []))].sort(), null, 1),
);
await browser.close();
