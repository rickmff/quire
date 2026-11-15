// Copies the stage output into the site: public/previews/<library>/ and
// lib/catalog/stage.json, then updates lib/catalog/data.json in place.
//   node publish.mjs <repoRoot> <library> [<library> ...]
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
const [root, ...libs] = process.argv.slice(2);
const STAGE = join(root, "lib/catalog/stage.json");
const DATA = join(root, "lib/catalog/data.json");
const shots = existsSync(STAGE) ? JSON.parse(readFileSync(STAGE, "utf8")) : {};
const data = JSON.parse(readFileSync(DATA, "utf8"));
for (const lib of libs) {
  const out = join("out", lib);
  const dir = join(root, "public/previews", lib);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const c of data.components.filter((c) => c.library === lib)) {
    const s = {};
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
    if (s.image) shots[c.id] = s; else { delete shots[c.id]; console.log("no preview:", c.id); }
  }
}
writeFileSync(STAGE, JSON.stringify(shots, null, 1) + "\n");
for (const c of data.components) {
  const s = shots[c.id];
  delete c.preview; delete c.previewDark; delete c.video; delete c.videoDark;
  if (!s) continue;
  c.preview = s.image;
  if (s.imageDark) c.previewDark = s.imageDark;
  if (s.video) c.video = s.video;
  if (s.videoDark) c.videoDark = s.videoDark;
}
writeFileSync(DATA, JSON.stringify(data));
console.log(Object.keys(shots).length, "components with stage previews");
