# How Quire works

The code has no comments (see [AGENTS.md](../AGENTS.md)). What the code cannot say by itself, such as why
something is done a certain way, which values must stay in step across files, and how the moving parts fit
together, lives here.

## Routes and views

The gallery lives in `app/app/layout.tsx`, above the pages, so moving between views keeps it mounted: no
reload and no second deal. `app/app/page.tsx` and `app/app/[...view]/page.tsx` only set metadata, and every
view shares the same title, description and canonical, because they are views of one app.

The address is the source of truth. Picking a view pushes its path; back, forward or a link moves the view.

| Path | View | `view` value (`lib/view.ts`) |
| --- | --- | --- |
| `/app` | Starred | `"starred"` |
| `/app/all-libraries` | All libraries, category by category | `"libraries"` |
| `/app/all-libraries/<library>[/<category>]` | One library, or one of its categories | `"site:<key>"`, `"site:<key>\|<group>"` |
| `/app/types/<type>` | One component type across the library | `"type:<id>"` |
| `/app/collections/<id>` | A collection | the collection id |
| `/app/sites`, `/app/agents` | Sites, Agents | `"sites"`, `"agents"` |

The old `"library"` and `"all"` views open Starred. A category is its family (`input`) or, for a family split
by type, the type (`text-effect`). Curated components group by library id; links the user added group by the
site they came from.

`/app?import=<url>` opens the import dialog for a whole site; the extension uses it. `/add?url=` is the
extension's save page and is kept out of search, as is `/api`. Both belong to adding by link, which is off
unless the build sets `NEXT_PUBLIC_QUIRE_USER_ADDS=1`; [user-adds.md](user-adds.md) lists every part of it.

## First load of /app

`lib/useIntro.ts` runs the entrance on every entry, from a refresh or from the landing:

```
wait ──dealt(ms)──▶ deal ──ms──▶ show ──900ms──▶ done
  │                                ▲
  ├──nothingToDeal or 1600ms───────┘   nothing to deal, or the catalog is slow
  └──reduced motion──▶ done
```

- `wait`: the chrome is hidden until the gallery has its cards and deals them.
- `deal`: the cards are in flight; the chrome waits for the last one to land.
- `show`: the sidebar and headers rise in.
- `done`: no entrance; later views mount as they are.

The phase is also the page's `data-intro` attribute (absent when done), which `app/globals.css` uses to hide
and raise the chrome. A phase moves only from the phase it expects, so a late timer or a second call does
nothing. Starred cards exist before the catalog arrives, so the deal waits until every card of the view is in.
`nothingToDeal` (a page that is not a gallery, or an empty one) and reduced motion are inputs read during
render, so the phase moves before the first paint instead of one frame later. Reduced motion is read with
`useSyncExternalStore` and is unknown (`null`) on the server, so the server always renders `wait`.

`lib/deal.ts` deals the visible cards out of one pile, using transforms and opacity only, so the grid keeps its
final layout. The first frame of a new page is long (layout, images), so the pile is shown standing still
through it and the clocks start once it has painted.

## Landing to /app hand-off

"Start collecting" (`components/StartLink.tsx`) asks the WebGL hero (`components/Quire3D.tsx`) to settle its
sheets into one flat pile under a camera that rises to look straight down. When it has settled, the hero sends
the page where the pile is and how each sheet's foil sits. `lib/deal.ts` draws an HTML pile in the same frame,
and `/app/all-libraries` deals that pile instead of making its own. The two piles are drawn in exactly the same
place, so the landing's copy can go at once; a fade would show two piles. If the hero stalls (a background tab),
the link goes anyway. Without WebGL a pile lies down over the stage instead. With reduced motion, or a click
with a modifier key, it is a plain link.

The HTML pile imitates the shader, so these values are kept in step by hand:

| In `lib/deal.ts` | Must match |
| --- | --- |
| Foil palette `foilAt(h) = 0.8 + 0.2 cos(2π (h − [0, 1/3, 2/3]))`, the per-sheet hue offset `fi * 0.061`, the key light falloff `exp(−r² / 0.55)`, the wash-out at the pinwheel's centre (smoothstep to 0.6 units, to 0.95 grey) | `FRAG` in `components/quire3d/shader.ts` |
| Sheets of 2 by 1.5 world units | `HALF` in the shader |
| Where the stack is drawn | the resize code in `Quire3D.tsx` |
| Pile turn per sheet (`pileRot`) | `pileTurn` in `Quire3D.tsx`, in radians |
| Seven sheets | `SHEETS` in the shader |

## The hero

`Quire3D` ray traces seven glass sheets in one fullscreen pass. Each sheet is a plane with a rounded-rect
footprint, so the intersection is analytic and the edges are antialiased from the SDF. Sheet `i` sits in slot
`(i + turn) mod N`: slots `0..N-2` are the stack and slot `N-1` is the sheet handed over. The turn is a spring,
so it can be dragged. The components on the sheets keep their state in JS, so the pointer can drive them.

Below 1.5 device pixels per CSS pixel the hero renders at twice the screen and lets the browser average it
down, because the sheet's text and edges are too coarse otherwise. When frames run slow it drops the
supersampling first, then resolution. The label atlas uses anisotropic filtering because the text is seen at a
slant.

## Gallery cards

A card runs its component live, in an iframe from the stage build, as soon as the mouse means it. Only one card
runs live at a time. `useCardLive` in `components/gallery/useCardLive.ts`, one controller object per card:

```
off ──start──▶ loading ──ready──▶ shown
 ▲                │                 │
 └────── end ─────┘    end ──▶ (grace, 250 ms) ──▶ off
```

Rest and dwell timers arm a start (one after the mouse stops, one after 300 ms on the card); grace delays the
end of a shown demo. A start or an end clears all three; a move clears rest and grace only, so dwell keeps
counting. The enter and leave events are the page's own, not React's: the variants menu is a portal, outside the
card in the DOM but inside it in React, and leaving the card for the menu must count as leaving.

The variants menu on a live preview opens in a ring around its gear:

```
closed ──open──▶ open (grown: false) ──next frame──▶ open (grown: true)
  ▲                   │  ▲                                 │
  └──── close ────────┘  └── pick a choice or go back ─────┘
```

`lib/ring.ts` lays the ring out from the labels' real widths. Each pill hangs off the ring by its inner edge, so
a long label only grows away from the centre and keeps its full text. The radius is the smallest at which no two
pills touch; when even the largest radius is too crowded, the pills stack down the ring's two sides, one row
each.

Starring a card moves it to the top with a FLIP animation. Card clips play only while on screen (one shared
`IntersectionObserver`); with reduced motion, only while the mouse is over them. A card swaps its clip for the
live demo when the mouse comes in slowly (under 0.35 px/ms), slows down or stops on it, or stays on it for
300 ms; the clip comes back 250 ms after the mouse leaves, and one card runs a demo at a time.

## The gallery's state

```
localStorage "quire:v1" ◀──▶ lib/store.ts (external store) ──useLibrary──▶ App
                                                                 │
             useViewRoute (address ⇄ view)  useGalleryData (what each view shows)
                                                                 │
             useLibraryActions (star, add, import, collections, copy, sync) ──update──▶ store
```

- The library is an external store read with `useSyncExternalStore`: the server and the hydration pass see an
  empty library and `ready` false, then the browser's copy. `update` applies the change, writes localStorage and
  notifies; a `storage` event from another tab reloads it. `writeLibrary` from the save page and the sync's
  `syncedAt` stamp go through the same store.
- With a sync key, changes to bookmarks, sources or mode are pushed 1.2 s after the last one; the push reads
  the latest library through `useEffectEvent`.
- The address is the source of truth for the view (see Routes); `useViewRoute` follows it during render.
- `components/App.tsx` reads `?import=` once the catalog has loaded, in an effect, because following a curated
  site or opening the dialog needs the catalog. It is the one place that sets state from an effect, and the
  ESLint rule is turned off on that line only.
- ESLint allows plain `<img>`: previews and favicons are files Quire serves itself or third-party images it does
  not resize, and the worker has no image optimizer.

## Taxonomy

`lib/types.ts` maps every component to a fixed set of types so that references from different sites line up.
Order matters: the first matching type wins, so specific types come before broad ones. The signals are read
strongest first: the component name, then the site's category, then the description. `lib/motion.ts` is the
second axis, what makes a component move (hover, scroll, ...), read from the name first and then the
description.

## Synced libraries, the MCP and the network

- The library key is a random secret held by the browser. Whoever has it can read and replace that library.
  The server accepts only the known fields, with size caps (`lib/sync.ts`).
- `lib/kv.ts` uses the first backend configured: Cloudflare KV over its REST API, Upstash Redis REST (Vercel
  KV's `KV_REST_API_URL` and `KV_REST_API_TOKEN` work too), or local files in `.data/` for development. The
  REST APIs work from any host, so no platform binding is needed.
- `/api/mcp` is a Model Context Protocol server over Streamable HTTP, written without an SDK. It answers
  JSON-RPC with plain JSON responses (no SSE stream), which the spec allows. `GET` returns 405 so clients use
  POST only. Every tool is read-only. The key comes from `?key=`, the `x-quire-key` header or a bearer token.
  `recommend` takes at most two references from one library.
- `lib/net.ts` fetches user-supplied URLs without reaching private network addresses, checking every redirect
  hop and capping the size. `QUIRE_SKIP_DNS_CHECK=1` turns the check off for sandboxes without DNS; never set
  it in production.
- `lib/capture.ts` is off unless both `QUIRE_CAPTURE_URL` and `QUIRE_CAPTURE_TOKEN` are set.

## Reading component sites

`/api/import` tries the most structured source first: a shadcn `registry.json` (listed in the public shadcn
index, hosted on GitHub and referenced by the site, or at the conventional path on the site), then links on the
page under its path grouped by the headings above them, then `sitemap.xml`. Counters such as "Inputs (6)" are
dropped from headings, and "New releases" style headings that repeat items lose to the first real category.

`lib/source.ts` reads a component's source from the live shadcn registry item first (JSON with every file
inline), then from the files in the site's GitHub repo.

## Curated catalog sources

`scripts/catalog/sources.ts` lists the libraries. Each source has a kind:

| Kind | Where the component list comes from |
| --- | --- |
| `registry` | a shadcn `registry.json` in the site's GitHub repo |
| `mdx` | docs pages in the repo, one `.mdx` per component, title and description in front matter |
| `pages` | a docs folder in the repo, one page per component, name only |
| `manual` | `scripts/catalog/manual.json`, for sites with no public repo |

`build-catalog.ts` reads each repo with a blobless clone, so it needs no API token. Previews from the Quire
stage win over a library's own media; captures fill in where there is none. `dedupe.ts` keeps one card per
component when a library publishes copies (Animate UI ships styled and primitive versions for Radix, Base UI
and Headless UI).

## Config notes

- `open-next.config.ts` sets `buildCommand` to `npm run build:next`, because `npm run build` runs OpenNext
  itself and would call itself.
- `wrangler.jsonc` sets a build command so the worker exists whatever the dashboard's build command is, and an
  empty `previews` block, which `wrangler preview` needs for branch builds and which keeps every top-level
  setting.
- CI uses Node 24 to match Cloudflare Workers Builds.
- `app/layout.tsx` and `components/app/useDropServiceWorkers.ts` remove any service worker on the origin and reload once. Quire
  registers none, but `localhost:3000` is shared by many projects and a stale worker breaks hydration.
- On quire.fyi, Cloudflare adds its managed content-signal block above `app/robots.ts`'s rules.
- `stage/setup.sh` pins `lucide-react@0.577.0` for Animate UI, because lucide-react 1.x dropped the brand
  icons (Github, Facebook) its demos use.

## Third-party code and design

- `components/ui/select.tsx` and `components/ui/tooltip.tsx` start from [shadcn/ui](https://ui.shadcn.com)
  (MIT), restyled with Quire's tokens.
- The button styles in `app/globals.css` (`.btn`, primary, secondary, ghost) are modeled on Clerk's buttons.
