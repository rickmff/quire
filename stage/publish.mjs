// Copies the stage output into the site: public/previews/<library>/ and
// lib/catalog/stage.json, then updates lib/catalog/data.json in place.
// It also records each component's live demo: the stage page built into
// public/stage/<library>/ (build.sh) and the frame the stills were cut from.
//   node publish.mjs <repoRoot> <library> [<library> ...]
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
const [root, ...libs] = process.argv.slice(2);
const STAGE = join(root, "lib/catalog/stage.json");
const DATA = join(root, "lib/catalog/data.json");
const shots = existsSync(STAGE) ? JSON.parse(readFileSync(STAGE, "utf8")) : {};
const data = JSON.parse(readFileSync(DATA, "utf8"));
const POSES = existsSync("poses.json") ? JSON.parse(readFileSync("poses.json", "utf8")) : {};
const VIEW = [1280, 800]; // the capture viewport (capture.mjs VW, VH)
const round = (n) => Math.round(n * 10) / 10;
for (const lib of libs) {
  const out = join("out", lib);
  const dir = join(root, "public/previews", lib);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const report = existsSync(join(out, "report.json")) ? JSON.parse(readFileSync(join(out, "report.json"), "utf8")) : {};
  const built = existsSync(join(root, "public/stage", lib, "index.html"));
  if (!built) console.log(`no live demos for ${lib}: run ./build.sh ${root} ${lib} first`);
  for (const c of data.components.filter((c) => c.library === lib)) {
    const s = {};
    const cfg = POSES[`${lib}/${c.name}`] ?? {};
    // The live demo opens the same stage page the stills were shot from, with the same frame.
    const page = (theme) => {
      const r = report[`${c.name}|${theme}`];
      if (!built || !r?.frame) return null;
      const q = new URLSearchParams({ c: c.name, theme });
      if (cfg.w) q.set("w", cfg.w);
      if (cfg.h) q.set("h", cfg.h);
      if (cfg.fill) q.set("fill", "1");
      if (cfg.box) q.set("box", "1");
      if (r.zoom && r.zoom !== 1) q.set("zoom", r.zoom);
      q.set("live", "1");
      const f = r.frame;
      return { src: `/stage/${lib}/index.html?${q}`, frame: [f.x, f.y, f.width, f.height].map(round) };
    };
    for (const [theme, suffix] of [["light", ""], ["dark", "-dark"]]) {
      const img = join(out, `${c.name}-${theme}.webp`);
      if (existsSync(img)) { copyFileSync(img, join(dir, `${c.name}${suffix}.webp`)); s[theme === "light" ? "image" : "imageDark"] = `/previews/${lib}/${c.name}${suffix}.webp`; }
    }
    // A clip only when both themes have one, so dark mode never plays the light clip.
    const vids = ["light", "dark"].map((t) => join(out, `${c.name}-${t}.mp4`));
    if (vids.every(existsSync)) {
      copyFileSync(vids[0], join(dir, `${c.name}.mp4`));
      copyFileSync(vids[1], join(dir, `${c.name}-dark.mp4`));
      s.video = `/previews/${lib}/${c.name}.mp4`;
      s.videoDark = `/previews/${lib}/${c.name}-dark.mp4`;
    }
    const [light, dark] = [page("light"), page("dark")];
    if (light) {
      s.live = { src: light.src, frame: light.frame, view: VIEW };
      if (dark) { s.live.srcDark = dark.src; s.live.frameDark = dark.frame; }
    }
    if (s.image) shots[c.id] = s; else { delete shots[c.id]; console.log("no preview:", c.id); }
  }
}
writeFileSync(STAGE, JSON.stringify(shots, null, 1) + "\n");
for (const c of data.components) {
  const s = shots[c.id];
  delete c.preview; delete c.previewDark; delete c.video; delete c.videoDark; delete c.live;
  if (!s) continue;
  c.preview = s.image;
  if (s.imageDark) c.previewDark = s.imageDark;
  if (s.video) c.video = s.video;
  if (s.videoDark) c.videoDark = s.videoDark;
  if (s.live) c.live = s.live;
}
writeFileSync(DATA, JSON.stringify(data));
console.log(Object.keys(shots).length, "components with stage previews");
