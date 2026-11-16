import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { chromium } from "playwright";
import sharp from "sharp";
import { AwsClient } from "aws4fetch";

try {
  for (const line of (await readFile(new URL(".env", import.meta.url), "utf8")).split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const TOKEN = process.env.CAPTURE_TOKEN;
const PORT = Number(process.env.PORT || 8080);
const MEDIA = process.env.MEDIA_DIR || new URL("./media", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const PUBLIC = (process.env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, "");
const CONCURRENCY = Number(process.env.CONCURRENCY || 2);
if (!TOKEN) throw new Error("Set CAPTURE_TOKEN");

const R2 = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_URL"].every((k) => process.env[k])
  ? {
      client: new AwsClient({ accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY, service: "s3", region: "auto" }),
      endpoint: `${process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`}/${process.env.R2_BUCKET}`,
      public: process.env.R2_PUBLIC_URL.replace(/\/$/, ""),
    }
  : null;

async function upload(file, name, type) {
  const r = await R2.client.fetch(`${R2.endpoint}/previews/${name}`, {
    method: "PUT",
    body: await readFile(file),
    headers: { "content-type": type, "cache-control": "public, max-age=31536000, immutable" },
  });
  if (!r.ok) throw new Error(`R2 upload ${r.status}`);
}
await mkdir(MEDIA, { recursive: true });

const PREVIEW_SELECTORS = [
  "[data-preview]",
  "[data-component-preview]",
  "[class*='ComponentPreview']",
  "[class*='component-preview']",
  "[class*='min-h-[450px]'][class*='border']",
  "[class*='min-h-[350px]'][class*='border']",
  "[class*='preview' i]:not(nav *):not(header *)",
  "main iframe",
  "[role='tabpanel']",
  "main",
];
const NOISE = /cookie|consent|gdpr|newsletter|intercom|crisp|chat-widget|announcement/i;

function privateIp(ip) {
  if (ip.includes(":")) return /^(::1|fc|fd|fe80|::ffff:127\.)/i.test(ip);
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}
async function publicUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(u.protocol) || u.hostname === "localhost") return null;
  if (process.env.ALLOW_PRIVATE === "1") return u;
  const addrs = isIP(u.hostname) ? [{ address: u.hostname }] : await lookup(u.hostname, { all: true }).catch(() => []);
  if (!addrs.length || addrs.some((a) => privateIp(a.address))) return null;
  return u;
}

let browser;
const getBrowser = async () => (browser?.isConnected() ? browser : (browser = await chromium.launch({ args: ["--no-sandbox"] })));

let running = 0;
const queue = [];
const slot = () => (running < CONCURRENCY ? (running++, Promise.resolve()) : new Promise((r) => queue.push(r)));
const free = () => (queue.length ? queue.shift()() : running--);

async function capture(url, withVideo, width = 1280) {
  const height = Math.round((width * 10) / 16);
  const id = createHash("sha1").update(width === 1280 ? url : `${url}#${width}`).digest("hex").slice(0, 16);
  const image = join(MEDIA, `${id}.webp`);
  const video = join(MEDIA, `${id}.webm`);
  const have = async (p) => stat(p).then(() => true, () => false);
  if ((await have(image)) && (!withVideo || (await have(video)))) return out(id, withVideo);

  const tmp = join(MEDIA, `.tmp-${id}`);
  const b = await getBrowser();
  const ctx = await b.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
    reducedMotion: "no-preference",
    ...(withVideo ? { recordVideo: { dir: tmp, size: { width: 1280, height: 800 } } } : {}),
  });
  const page = await ctx.newPage();
  try {
    await page.route("**/*", (r) => (/\.(woff2?|ttf)$/.test(r.request().url()) || !NOISE.test(r.request().url()) ? r.continue() : r.abort()));
    const res = await page.goto(url, { waitUntil: "networkidle", timeout: 25000 }).catch(() => page.waitForLoadState("domcontentloaded").then(() => null));
    if (res && res.status() >= 400) throw new Error(`page returned ${res.status()}`);
    await page.addStyleTag({ content: `[class*="cookie" i],[id*="cookie" i],[class*="consent" i]{display:none!important}` }).catch(() => {});
    await page.waitForTimeout(1200);

    let target = null;
    for (const sel of PREVIEW_SELECTORS) {
      const el = page.locator(sel).first();
      if (!(await el.count().catch(() => 0))) continue;
      const box = await el.boundingBox({ timeout: 1500 }).catch(() => null);
      if (box && box.width > 240 && box.height > 140 && box.height < 1400) {
        target = { el, box };
        break;
      }
    }
    if (target) await target.el.scrollIntoViewIfNeeded().catch(() => {});
    const box = target ? await target.el.boundingBox() : { x: 0, y: 0, width: 1280, height: 800 };

    if (withVideo && box) {
      const steps = 24;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        await page.mouse.move(box.x + box.width * (0.15 + 0.7 * t), box.y + box.height * (0.5 + 0.25 * Math.sin(t * Math.PI * 2)));
        await page.waitForTimeout(90);
      }
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2).catch(() => {});
      await page.waitForTimeout(900);
    }

    const png = target ? await target.el.screenshot({ timeout: 8000 }) : await page.screenshot();
    const { channels } = await sharp(png).stats();
    if (channels.slice(0, 3).every((c) => c.stdev < 2)) throw new Error("blank page");
    await sharp(png).resize({ width, height, fit: "cover", position: "centre" }).webp({ quality: width < 1280 ? 72 : 78 }).toFile(image);
  } finally {
    await page.close().catch(() => {});
    const vid = withVideo ? await page.video()?.path().catch(() => null) : null;
    await ctx.close().catch(() => {});
    if (vid) await rename(vid, video).catch(() => {});
    await rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
  if (R2) {
    await upload(image, `${id}.webp`, "image/webp");
    if (withVideo && (await have(video))) await upload(video, `${id}.webm`, "video/webm");
  }
  return out(id, withVideo);
}
const base = () => (R2 ? `${R2.public}/previews` : `${PUBLIC}/media`);
const out = (id, withVideo) => ({ image: `${base()}/${id}.webp`, ...(withVideo ? { video: `${base()}/${id}.webm` } : {}) });

const TYPES = { ".webp": "image/webp", ".webm": "video/webm" };
const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { "content-type": "application/json", "access-control-allow-origin": "*", ...headers });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};

createServer(async (req, res) => {
  const path = new URL(req.url, "http://x").pathname;
  if (req.method === "GET" && path === "/health") return send(res, 200, { ok: true, storage: R2 ? "r2" : "disk", running, queued: queue.length });
  if (req.method === "GET" && path.startsWith("/media/")) {
    const file = path.slice(7);
    if (!/^[a-f0-9]{16}\.(webp|webm)$/.test(file)) return send(res, 404, { error: "not-found" });
    try {
      const body = await readFile(join(MEDIA, file));
      return send(res, 200, body, { "content-type": TYPES[extname(file)], "cache-control": "public, max-age=31536000, immutable" });
    } catch {
      return send(res, 404, { error: "not-found" });
    }
  }
  if (req.method === "POST" && path === "/capture") {
    if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(res, 401, { error: "unauthorized" });
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 10_000) return send(res, 413, { error: "too-large" });
    }
    let input;
    try {
      input = JSON.parse(body);
    } catch {
      return send(res, 400, { error: "bad-json" });
    }
    const u = await publicUrl(input.url);
    if (!u) return send(res, 400, { error: "bad-url" });
    await slot();
    try {
      const width = Math.max(320, Math.min(1280, Math.round(Number(input.width) || 1280)));
      return send(res, 200, await capture(u.href, input.video !== false, width));
    } catch (e) {
      return send(res, 502, { error: String(e?.message || e).slice(0, 200) });
    } finally {
      free();
    }
  }
  send(res, 404, { error: "not-found" });
}).listen(PORT, () => console.log(`capture on :${PORT}, media at ${PUBLIC}/media/`));
