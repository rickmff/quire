# Quire stage

Renders the preview of every catalog component from the component's own demo,
instead of taking a screenshot of the library's docs page. The same stage, built
as a static site, runs each demo live in the gallery.

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
   30 fps when the component moves. The clip plays the component's interaction:
   a drawn pointer hovers, clicks, drags or types on a timeline (see Clips).

## Run it

Needs Node 20+, Chromium for Playwright (`npx playwright install chromium`) and ffmpeg.

```bash
cd stage
npm install
./setup.sh magicui                 # builds app-magicui/
(cd app-magicui && PORT=5181 npx vite) &
node capture.mjs magicui 5181 out/magicui          # stills
node video.mjs magicui 5181 out/magicui            # clips
./build.sh .. magicui animate-ui                   # live demos: public/stage/<library>/
node publish.mjs .. magicui animate-ui             # copy into public/previews and the catalog
```

`capture.mjs` and `video.mjs` take component names after the output folder to
redo only those. Look at `out/<library>/*.thumb.png` before publishing
(`python3 sheet.py <library> <light|dark>` makes contact sheets).

`publish.mjs` writes `public/previews/<library>/<name>.webp` and `<name>-dark.webp`
(plus `.mp4` and `-dark.mp4` when both themes have a clip), records them in
`lib/catalog/stage.json`, and updates `lib/catalog/data.json`.

## Live demos

`build.sh` builds each stage app with Vite into `public/stage/<library>/` (base
`/stage/<library>/`). `publish.mjs` then gives each component a `live` record:
the stage page with the same options as its stills, the capture viewport
(1280x800) and the frame the stills were cut from, per theme.

The gallery opens that page in an iframe on its own origin, lays it out at the
capture viewport and scales the frame to the card, so the live demo lines up
with the still under it. It fades in when the demo has mounted. With `live=1`
the stage:

- tells the gallery when the demo is ready (`postMessage`),
- keeps demo links and forms from navigating the frame,
- passes Escape to the gallery when the demo has no dialog or menu open,
- with `grid=1`, opens the card on a click outside the demo's controls (for a
  card that runs it; the gallery does not use this today).

The detail panel runs the demo with hover, click and keyboard, and has a
Restart button. Cards do not run it: their clips loop and already show the
interaction. A card clip plays while the card is on screen or within 200px of
it, and pauses off screen (one shared `IntersectionObserver`). With reduced
motion, a clip plays only while the mouse is over it.

Demos that use shiki get a build with only the grammars and themes they use
(`template/src/shims/shiki.ts`). Files demos load from the docs site's root
(`/mug.webp`) are rewritten to the base path at build time.

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
| `freetheme` | let the demo change the theme (theme togglers); the stage forces the URL's theme otherwise |
| `video` | options and steps for the clip (see Clips) |

## Clips

`video.mjs` records each clip at the capture viewport (1280x800) and crops it to
the still's frame. Before the first frame it remounts the demo (`__remount()` on
the stage), so entrance animations play from their start. When a pose has
pointer steps, the stage draws a pointer (`cursor=<px>`, scaled to the frame)
that follows the mouse and shows a ring on each press.

`video` takes:

| Key | Meaning |
| --- | --- |
| `seconds` | clip length (default: last step + 1.8 s, at least 4 s) |
| `lead` | ms to wait after the remount, before the clip starts |
| `force` | keep the clip even if it barely moves |
| `remount` | `false` keeps the demo as loaded instead of remounting it |
| `cursor` | `false` hides the pointer, `true` shows it without pointer steps |
| `start` | where the pointer starts, `[fx, fy]` (default `[0.82, 1.15]`, below the frame) |
| `slow` | record in slow motion by this factor (see below) |
| `pingpong` | play the clip forward then back, so a slow drift loops without a jump |
| `steps` | `[{at: ms, ...action}]` on the clip's clock |

Steps run on the clip's clock: a glide or a scroll ends on time even when screenshots
slow the browser down (`DEBUG=1` prints when each step starts). When a step scrolls or runs a script, each frame is cut from a
shot of the whole viewport, so a page that scrolls stays in place in the clip.

Points are `[fx, fy]` relative to the frame (`[0, 0]` top left, `[1, 1]`
bottom right), or a selector with `pos` (`[0.5, 0.5]` is its center) and `nth`.
The pointer glides between points with an ease, in `ms` (default 650).

| Action | Meaning |
| --- | --- |
| `hover` | glide to a selector or point |
| `to` | glide to a point |
| `path` | glide through a list of points in `ms` (default 1800) |
| `click`, `rightclick`, `dblclick` | glide to the target and press; `true` presses where the pointer is |
| `drag` | `{from, to}`: press at `from`, glide to `to`, release |
| `down`, `up` | press or release the mouse button |
| `scroll` | wheel by this many px over `ms` |
| `type`, `press` | type text, press a key |
| `eval` | run a script in the page |
| `leave` | glide out of the frame and hide the pointer |

When Chrome cannot paint a demo at 18 fps here (heavy WebGL or canvas), the clip
is recorded again in slow motion: timers, animation frames, `Date`,
`performance.now()` and CSS or Web Animations run k times slower (k up to 12),
and frames are resampled to 30 fps on the clip's clock. A clip that is still
too slow, or that does not move, is skipped and keeps the last good file.

Cards loop these clips, so each stays light: a clip over 600 KB (photos,
full-frame gradients) is encoded again at 960x600 and a higher CRF.

Video embeds (YouTube) do not load on the capture machine, so a clip shows their
player as a black box. The live demo plays them.

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

Some demo URLs are dead at their origin too (a replaced avatar, a removed icon).
The stage hides an image that fails to load, so the preview shows an empty slot
instead of a broken-image icon with its alt text. For a dead image the demo
cannot do without, map its URL in `mirror/manifest.json` to a stand-in from the
library itself. The Animate UI avatar on X
(`pbs.twimg.com/profile_images/1950218390741618688/...`) is dead; its stand-in is
the library's `apps/v1/apps/www/public/apple-touch-icon.png`, saved as
`mirror/animate-ui-icon.png`:

```json
"https://pbs.twimg.com/profile_images/1950218390741618688/72447Y7e_400x400.jpg": { "file": "animate-ui-icon.png", "type": "image/png" }
```
