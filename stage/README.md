# Quire stage

Renders the preview of every catalog component from the component's own demo,
instead of taking a screenshot of the library's docs page.

For each library it:

1. Reads the demo item and everything it depends on from the library's shadcn
   registry in its GitHub repo, and writes the files into a Vite app
   (`app-<library>/`, built from `template/`). Images the demos load from the
   docs site (`src="/mug.webp"`) come from the docs app's `public/` folder.
2. Opens each demo on a neutral stage with the shadcn theme, in light and dark.
3. Poses it with the steps in `poses.json`: open the dialog, hover the button,
   wait for the animation to settle.
4. Frames what is on screen (by pixels, so glows and portals count), pads it to
   16:10 and shrinks components that do not fit.
5. Saves a 1600×1000 WebP per theme from a 4x screenshot, and an MP4 clip at
   30 fps when the component moves. The clip replays the pose on a timeline.

## Run it

Needs Node 20+, Chromium for Playwright (`npx playwright install chromium`) and ffmpeg.

```bash
cd stage
npm install
./setup.sh magicui                 # builds app-magicui/
(cd app-magicui && PORT=5181 npx vite) &
node capture.mjs magicui 5181 out/magicui          # stills
node video.mjs magicui 5181 out/magicui            # clips
node publish.mjs .. magicui animate-ui             # copy into public/previews and the catalog
```

`capture.mjs` and `video.mjs` take component names after the output folder to
redo only those. Look at `out/<library>/*.thumb.png` before publishing
(`python3 sheet.py <library> <light|dark>` makes contact sheets).

`publish.mjs` writes `public/previews/<library>/<name>.webp` and `<name>-dark.webp`
(plus `.mp4` and `-dark.mp4` when both themes have a clip), records them in
`lib/catalog/stage.json`, and updates `lib/catalog/data.json`.

## Poses

`poses.json` maps `<library>/<name>` to options:

| Key | Meaning |
| --- | --- |
| `wait` | ms to wait before the shot (default 2500) |
| `steps` | list of `{wait}`, `{hover: selector, at: [x, y]}`, `{click}`, `{rightclick}`, `{move: [x, y]}`, `{type}`, `{press}`, `{scroll: px}` |
| `w`, `h` | width and height of the stage box, in px |
| `fill` | the demo fills the whole stage (backgrounds) |
| `box` | draw a bordered, clipped panel around the stage box (scroll areas) |
| `zoom` | fixed zoom instead of the automatic fit |
| `min`, `pad` | smallest frame width (default 320) and padding around the content (default 1.28) |
| `video` | `{seconds, lead, force, steps: [{at: ms, hover|move|click|type|press, pos}]}` |

## Demos the library does not ship

`custom/<library>/<name>.tsx` is used as the demo when present. Keep these
minimal and built only from the component itself.

## Hosts the capture machine cannot reach

Some demos load images from other hosts (avatars, photos, icons). When the
capture machine cannot reach them, `capture.mjs` lists them in
`out/<library>/blocked.json`. Download them on a machine that can:

```bash
node -e 'const fs=require("fs"),u=new Set();for(const l of fs.readdirSync("out"))for(const x of JSON.parse(fs.readFileSync(`out/${l}/blocked.json`)))u.add(x);console.log([...u].join("\n"))' > mirror/urls.txt
node mirror/fetch-assets.mjs mirror/urls.txt mirror
```

Copy the resulting `mirror/` folder (files plus `manifest.json`) next to
`capture.mjs`. Both capture scripts then serve those URLs from it.
