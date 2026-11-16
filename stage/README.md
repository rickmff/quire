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
MEASURE=1 node video.mjs magicui 5181 out/magicui  # where each clip paints (see Framing)
python3 frame.py magicui --write                   # then capture and record those again
./build.sh .. magicui animate-ui                   # live demos: public/stage/<library>/
node publish.mjs .. magicui animate-ui             # copy into public/previews and the catalog
```

Environment variables:

| Variable | Used by | What it does |
| --- | --- | --- |
| `REG_LOCAL_MAGICUI`, `REG_LOCAL_ANIMATE_UI` | `install.mjs` | Local checkout of a library's `public/r` registry folder, read before GitHub |
| `REG_CACHE` | `install.mjs` | Where registry files are cached (default `/tmp/quire-reg`) |
| `JOBS` | `capture.mjs`, `video.mjs` | Components processed at once (default 3) |
| `MEASURE=1` | `video.mjs` | Measure where each clip paints instead of recording it (see Framing) |
| `FORCE=1` | `video.mjs` | Keep every clip, even one that barely moves |
| `DEBUG=1` | `video.mjs` | Print when each step starts |
| `REPORT` | `frame.py` | The capture report to compare frames with (default `out/<library>/report.json`) |

`setup.sh` pins `lucide-react@0.577.0` for Animate UI: lucide-react 1.x dropped the brand icons its demos use.

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
- with `card=1`, keeps a demo from taking the keyboard focus from the gallery
  until it is clicked, pressed or typed in.

The detail panel runs the demo with hover, click and keyboard, and has a
Restart button. A card runs it too, in place of its clip, as soon as the mouse
means the card: it comes in slowly (under 0.35 px/ms), slows down or stops on it,
or stays on it for 300 ms. A pass across the grid is faster and loads nothing, and
a demo not yet on screen when the mouse leaves is dropped, so a pass never flashes
one. The clip comes back 250 ms after the mouse leaves. One card runs a demo at a
time. The star, the open icon and the gear stay above the demo.

The stage page loads the demo's module before its first render. A lazy component
would suspend, and React holds a Suspense boundary back up to 300 ms before it
shows the content. A card's demo is on screen about 60 ms after its frame starts
loading (with the files cached), and fades in over 150 ms. A card clip plays while the card is
on screen or within 200px of it, and pauses off screen (one shared
`IntersectionObserver`). With reduced motion, a clip plays only while the mouse
is over it.

Demos that use shiki get a build with only the grammars and themes they use
(`template/src/shims/shiki.ts`). Files demos load from the docs site's root
(`/mug.webp`) are rewritten to the base path at build time.

## Framing

The still and the clip of a component share one frame, so the clip, the still
and the live demo line up. `capture.mjs` cuts it around what the still shows.
That misses what the clip shows later (an open menu, a tab panel) and anything
one theme paints too faintly to see. `MEASURE=1 node video.mjs` plays each clip
without recording it and samples where the demo paints, in both themes
(`out/<library>/measure.json`). `frame.py` then builds each frame:

- centered on the demo at rest (its last sample: clips end at rest, so they loop),
- wide enough on both sides for everything it shows after its first second
  (entrances that fly in do not count),
- for a menu, popover or card that opens from a small trigger, centered on all
  it shows instead, so the trigger does not shrink to a dot.

It prints the components whose frame moves off center or cuts content, and
`--write` adds their frames to `frames/<library>.json` (`--redo name ...` adds
others). `capture.mjs` uses those frames over its own; capture and record those
components again. A demo the stage made wider than its own `max-width` was a
stage bug: `#subject > *` is now in Tailwind's base layer, under the utilities.

## Variants

`install.mjs` also lists the other versions of each component that its library
shows, and the gallery's gear menu switches the live demo to them:

- Magic UI: the extra examples in the registry (`confetti-fireworks`,
  `dock-demo-2`). They are installed with the default demo, as
  `<name>~<example>` entries of `src/demos.tsx`. The stage takes `v=<example>`.
- Animate UI: the docs controls of a demo (`meta.demoProps`) that offer a
  choice, a list of options or on/off. The stage takes them as props, `p=<json>`.

They are the `variants` in `app-<library>/demos.json`; `publish.mjs` copies them to
`live.variants` in the catalog. The gear sits at the bottom left of a card that
has variants, and in the detail panel. It opens the choices in a circle around
it; a second level lists the options. A dot on the gear shows that a variant
other than the default runs. Clips and stills always show the default.

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
| `center` | `"layout"`: center the frame on the stage, not on the demo (a shadow or glow on one side) |
| `spill` | fit the frame to the demo at rest; its effect (particles, a cursor, a theme change) runs past the edges |
| `keepframe` | `frame.py` keeps the frame `capture.mjs` cut |
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
