# Quire

- Do not write code comments. `npm run check:comments` fails on them in CI. What the code cannot say goes in
  `docs/architecture.md`.
- Before you finish, run `npm run check` and `npm run build`.

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
| `stage/` | The preview stage that builds live demos into `public/stage/` and records previews into `public/previews/`. |
| `capture/`, `extension/` | The optional capture service and the Chrome extension. |
| `e2e/` | Playwright end-to-end tests. Unit tests sit next to the code they test, as `*.test.ts`. |
| `docs/architecture.md` | Why things are the way they are: state diagrams, values kept in step, config reasons. |

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
