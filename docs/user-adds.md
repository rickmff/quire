# Adding by link (paused)

Quire can let a visitor add components that are not in the curated catalog. These features are in the code and
are turned off. Libraries now enter Quire through the catalog pipeline in `stage/` and `scripts/`, so that every
component has a checked preview and a licence that allows it to be shown.

Nothing was deleted. One flag turns everything on again.

## The flag

`lib/features.ts` exports `USER_ADDS`. It is `true` only when the build has `NEXT_PUBLIC_QUIRE_USER_ADDS=1`.

```bash
NEXT_PUBLIC_QUIRE_USER_ADDS=1 npm run dev
```

The value is read at build time, so set it before `npm run build` for a production build. For a local
checkout, put it in `.env.local`.

The repository bans code comments (`npm run check:comments`), so the code is not commented out. Each entry
point checks the flag instead.

## What is paused

| Feature | What it does | Where it lives | How the flag stops it |
| --- | --- | --- | --- |
| Add one component by link | Paste a link anywhere, or type it in the top bar in add mode (`+`). Quire stars the link, then reads its title, description and image. | `add` in `components/app/useLibraryActions.ts`, `components/app/TopBar.tsx`, `components/app/useShortcuts.ts`, `components/app/Empty.tsx` | The bar has search mode only, the `+` key and the paste listener do nothing, and an empty collection does not offer example links. |
| Link details | Reads the Open Graph tags of a page for the link above. | `app/api/meta/route.ts`, `fetchMeta` in `lib/store.ts` | The route answers 404. |
| Import a whole site | Reads a library's shadcn registry, its component links or its sitemap, sorts what it finds by type and lets the visitor pick. Opens from the top bar, the command menu, the Sites page or `/app?import=<url>`. | `components/ImportDialog.tsx`, `app/api/import/route.ts`, `importSite` in `components/app/useLibraryActions.ts`, `lib/importTypes.ts` | The dialog never mounts, its three openers are hidden, `?import=` is ignored and the route answers 404. |
| Extension save page | `/add?url=` saves the page the Chrome extension sends. | `app/add/` | The page answers 404. |
| Chrome extension | Saves the current page, or the whole library, to Quire. | `extension/` | Not changed. It calls `/add` and `/app?import=`, which are off. |
| Capture service | Records a still and a clip of a link that has no preview image. | `capture/`, `lib/capture.ts`, `app/api/capture/route.ts`, `capturePreviews` in `components/app/useLibraryActions.ts` | `captureEnabled()` is false, so `/api/capture` answers 404 and `/api/status` reports `capture: false`. |

## What still works

- Starring a catalog component, collections, notes, export and backup.
- Links a visitor added before the pause stay in their library. They show on Starred, in their collection and
  under "Your sites" on the Sites page.
- Sync and the MCP endpoint, including for those older links.

## Tests

`e2e/gallery.spec.ts` has one test for each state. "adding by link is off unless the build turns it on" runs by
default. "pasting a link anywhere stars it" runs only when the tests are started with
`NEXT_PUBLIC_QUIRE_USER_ADDS=1`.

## To remove the features for good

Delete the files in the "Where it lives" column, the `extension/` and `capture/` folders, `lib/libraries.ts`,
`lib/features.ts` and every use of `USER_ADDS`. `lib/net.ts` stays: `lib/source.ts` uses it to fetch component
source for the MCP endpoint.
