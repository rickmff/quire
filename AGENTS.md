# Working on Quire

## No code comments

Do not write comments in code. This covers `//` and `/* */` in TypeScript, JavaScript and CSS, JSX comments,
JSDoc, comments inside GLSL strings, `#` in shell, Python, YAML and Dockerfiles, and `<!-- -->` in HTML.
`npm run check:comments` fails on any of them, and CI runs it.

Make the code say it instead: a precise name, a named constant, a type, a small function. When something
cannot be said in code, such as why a choice was made, a value that must match another file, a state diagram,
or how to run a script, write it in `docs/architecture.md` or in the README of the folder.

Comments that tools read are allowed, and the check lets them through: `@ts-expect-error`, `@ts-ignore`,
`@ts-nocheck`, `/// <reference>`, lint and formatter directives, `@jsx` pragmas, bundler hints such as
`/*#__PURE__*/`, `webpackChunkName` and `@vite-ignore`, licence headers (`/*!`, `@license`, `@preserve`,
`SPDX-License-Identifier`, `Copyright`), and the shebang line of a script. Use them only when the tool needs them.

Do not edit generated or vendored files: `public/stage/` and `public/previews/` (built
by the stage) and lockfiles. The check skips them.

## Where things live

| Path | What it holds |
| --- | --- |
| `app/` | Next.js routes. `app/page.tsx` is the landing, `app/app/layout.tsx` mounts the gallery once for every `/app/...` view, `app/add/` is the extension's save page, `app/api/*` are the server routes (catalog, MCP, sync, import, meta, source, capture). |
| `components/App.tsx` | The gallery's composition root: it wires the hooks below to the parts below and holds only UI state (dialog, palette, search bar). |
| `components/app/` | The gallery shell: `Sidebar`, `TopBar`, `CommandMenu`, `CollectionView`, `Toast`, dialogs, and the hooks `useViewRoute`, `useGalleryData` (what each view shows), `useLibraryActions` (every change to the library), `useShortcuts`, `useGridKeys`, `useToast`. |
| `components/gallery/` | The component grid and its card, previews and live frames, the hover live demo (`useCardLive`), the variants ring, the detail drawer, the Sites and Agents pages. |
| `components/` (top level) | The landing: the WebGL hero (`Quire3D`, `quire3d/shader.ts`), `FocusReveal`, `StartLink`, wordmark and social links. `components/ui/` holds the shadcn-based primitives. |
| `lib/` | Logic with no markup. Browser state: `store.ts` (the library in localStorage), `useCatalog.ts`, `useIntro.ts`, `media.ts`. Shared rules: `view.ts` (views and their URLs), `groups.ts`, `types.ts` and `motion.ts` (taxonomy), `libraries.ts`. Server only: `net.ts`, `kv.ts`, `sync.ts`, `mcp.ts`, `source.ts`, `capture.ts`, `rateLimit.ts`. |
| `lib/catalog/` | The curated catalog: `data.json` (generated), its schema, search and facets. |
| `scripts/` | The catalog build (`build-catalog.ts`, `catalog/sources.ts`) and the comment check. |
| `stage/` | The preview stage that builds live demos into `public/stage/` and records previews into `public/previews/`. See its README. |
| `capture/`, `extension/` | The optional capture service and the Chrome extension, each with its own README. |
| `docs/architecture.md` | Why things are the way they are: state diagrams, values kept in step, config reasons. |

Tests sit next to the code they test, as `*.test.ts`.

## How to write code here

- **Keep App thin.** A new feature in the gallery is a hook in `components/app/` (state and actions) plus a
  component (markup), wired in `components/App.tsx`. Pure logic goes in `lib/` with a test beside it.
- **Change the library only through `update`** from `useLibrary` (in practice through `useLibraryActions`).
  It writes localStorage and every open tab follows.
- **Explicit states.** When a piece of UI has a few real states, keep them in one value of a named union, move
  only from the state you expect, and draw the transitions in `docs/architecture.md`. `lib/useIntro.ts` and
  `components/gallery/useCardLive.ts` are the models.
- **React rules are enforced by ESLint** (the React Compiler rules in `eslint-config-next`). In practice: do not
  set state in an effect to follow a prop, reset it during render with the previous value kept in state
  (`useGridKeys`, `Detail`); read browser-only values with `useSyncExternalStore` (`lib/media.ts`,
  `lib/useClientValue.ts`); let window listeners read fresh props with `useEffectEvent` (`useShortcuts`); do not
  read or write `ref.current` during render.
- **Untrusted links** on the server go through `fetchText` or `safeUrl` in `lib/net.ts`, never a bare `fetch`.
- **Same look, same behavior.** A refactor must not change what the person sees. Check the views you touched in
  the browser, in both themes; if a fix needs a visible change, say so.

## Checks before you finish

```bash
npm run check
npm run build
```

`npm run check` runs the comment check, Prettier, ESLint, the type check and the Vitest tests, the same steps CI
runs. `npm run format` fixes formatting.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
