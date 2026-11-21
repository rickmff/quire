import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
const [root, ...libs] = process.argv.slice(2);
const STAGE = join(root, "lib/catalog/stage.json");
const DATA = join(root, "lib/catalog/data.json");
const shots = existsSync(STAGE) ? JSON.parse(readFileSync(STAGE, "utf8")) : {};
const data = JSON.parse(readFileSync(DATA, "utf8"));
const POSES = existsSync("poses.json") ? JSON.parse(readFileSync("poses.json", "utf8")) : {};
const VIEW = [1280, 800];
const round = (n) => Math.round(n * 10) / 10;
for (const lib of libs) {
  const out = join("out", lib);
  const dir = join(root, "public/previews", lib);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const report = existsSync(join(out, "report.json")) ? JSON.parse(readFileSync(join(out, "report.json"), "utf8")) : {};
  const built = existsSync(join(root, "public/stage", lib, "index.html"));
  const variants = Object.fromEntries(
    (existsSync(join(`app-${lib}`, "demos.json"))
      ? JSON.parse(readFileSync(join(`app-${lib}`, "demos.json"), "utf8"))
      : []
    )
      .filter((d) => d.variants)
      .map((d) => [d.name, d.variants]),
  );
  if (!built) console.log(`no live demos for ${lib}: run ./build.sh ${root} ${lib} first`);
  for (const c of data.components.filter((c) => c.library === lib)) {
    const s = {};
    const cfg = POSES[`${lib}/${c.name}`] ?? {};
    const page = (theme) => {
      const r = report[`${c.name}|${theme}`];
      if (!built || !r?.frame) return null;
      const q = new URLSearchParams({ c: c.name, theme });
      if (cfg.w) q.set("w", cfg.w);
      if (cfg.h) q.set("h", cfg.h);
      if (cfg.fill) q.set("fill", "1");
      if (cfg.box) q.set("box", "1");
      if (cfg.freetheme) q.set("freetheme", "1");
      if (r.zoom && r.zoom !== 1) q.set("zoom", r.zoom);
      q.set("live", "1");
      const f = r.frame;
      return { src: `/stage/${lib}/index.html?${q}`, frame: [f.x, f.y, f.width, f.height].map(round) };
    };
    const img = join(out, `${c.name}-dark.webp`);
    if (existsSync(img)) {
      copyFileSync(img, join(dir, `${c.name}.webp`));
      s.image = `/previews/${lib}/${c.name}.webp`;
    }
    const vid = join(out, `${c.name}-dark.mp4`);
    if (existsSync(vid)) {
      copyFileSync(vid, join(dir, `${c.name}.mp4`));
      s.video = `/previews/${lib}/${c.name}.mp4`;
    }
    const live = page("dark");
    if (live) {
      s.live = { src: live.src, frame: live.frame, view: VIEW };
      if (variants[c.name]) s.live.variants = variants[c.name];
    }
    if (s.image) shots[c.id] = s;
    else {
      delete shots[c.id];
      console.log("no preview:", c.id);
    }
  }
}
writeFileSync(STAGE, JSON.stringify(shots, null, 1) + "\n");
for (const c of data.components) {
  const s = shots[c.id];
  delete c.preview;
  delete c.video;
  delete c.live;
  if (!s) continue;
  c.preview = s.image;
  if (s.video) c.video = s.video;
  if (s.live) c.live = s.live;
}
writeFileSync(DATA, JSON.stringify(data));
console.log(Object.keys(shots).length, "components with stage previews");
