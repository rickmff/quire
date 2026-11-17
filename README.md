<p align="center">
  <a href="https://quire.fyi"><img src="public/og.png" alt="quire: Keep every component you find. Hand them to your agent." width="100%"></a>
</p>

<p align="center">
  Keep every UI component you find, watch it run, and hand it to your AI agent.
</p>

<p align="center">
  <a href="https://quire.fyi">Website</a> ·
  <a href="#features">Features</a> ·
  <a href="#browser-extension">Extension</a> ·
  <a href="#run-it-locally">Run locally</a> ·
  <a href="#deploy-and-ci">Deploy and CI</a>
</p>

## What it is

Quire is a gallery for UI components. Start from the curated catalog, add components and whole libraries by
link, star the ones you want to keep, and give your agent everything it needs to use them: the
install command, the source and your notes, over MCP, or a brief with one click on **Copy for agent**.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/app-dark.png">
    <img src=".github/assets/app-light.png" alt="The All libraries view in quire, with live previews and a Copy for agent button on each card" width="100%">
  </picture>
</p>

## Features

- **Curated catalog.** 166 components from Magic UI (79) and Animate UI (87), read from each library's registry. Every one has a preview rendered and checked by hand. Turn a library off any time, or start from scratch.
- **Previews that move.** Cards loop a short clip of the component in action. Hover a card and the real component runs inside it, live; a gear menu switches between its variants.
- **All libraries, sorted.** Browse one library or all of them at once, filtered by the motion that drives each component: hover, click, scroll, cursor, drag, typing, entrance, ambient loop, state change.
- **Star what you keep.** Starred holds your picks. Group them in collections and leave a note for your agent.
- **Copy for agent.** Every card copies a ready-to-paste brief: what the component is, its docs, how to install it, and its Quire id for fetching the source over MCP.
- **One bar for search and add.** The top bar searches the current view (`/`) or takes a link (`+`) to add one component or a whole library. Quire reads the library's registry, pages or sitemap and sorts what it finds by type. ⌘K opens commands and export.
- **MCP for agents.** `/api/mcp` serves the curated catalog, or your own library with your key. Tools: `recommend`, `search_components`, `get_component`, `get_component_source`, `get_filters`, `list_libraries`.
- **Chrome extension.** Save the page you are on, or the whole library it belongs to, without leaving it.

## MCP

```bash
claude mcp add --transport http quire https://quire.fyi/api/mcp
```

Open **Agents** in the app and click **Connect my library** to get the same address with a private `key`.
Give your agent a brief, for example "pricing page with a playful toggle and a magnetic button". It calls
`recommend`, then `get_component_source` for the references it adapts.

## Browser extension

`extension/` is a Chrome extension (Manifest V3).

1. Open `chrome://extensions` and turn on Developer mode.
2. Click **Load unpacked** and select the `extension/` folder.
3. Click the icon or press Alt+S on a component page to save it.
4. Press Alt+Shift+S, or right-click, to add the whole component library you are on.
5. On x.com, click the quire button next to X's bookmark button to save a post.

The extension saves to [quire.fyi](https://quire.fyi). To use your own instance, set its address in the extension options.

## Run it locally

Needs Node 20 or newer. Nothing to sign up for, and no environment variables: it takes a few minutes from clone to a running app.

```bash
git clone https://github.com/rickmff/quire.git
cd quire
npm install
npm run dev
```

1. Open [localhost:3000](http://localhost:3000) and click **Start collecting**. A new visitor starts with every curated library turned on; turn any of them off under **Sites**.
2. Your library lives in the browser. Synced libraries for the MCP are saved in `.data/`.
3. For the MCP, point your agent at `http://localhost:3000/api/mcp` (add `?key=<your key>` from **Agents** for your own library).
4. For the extension, set its address to `http://localhost:3000` in its options.
5. For previews of components you add by link, run the capture service on your computer, in [`capture/`](capture).

`npm run build:next` runs a plain Next.js build, and `QUIRE_FILE_STORE=1 npm start` serves it while still saving to `.data/`.

The link preview API (`/api/meta`) blocks private network addresses. In a sandbox without DNS, set `QUIRE_SKIP_DNS_CHECK=1` for local testing only.

### Optional services

Put these in `.env.local`. Without any of them, everything above works on your machine.

| Variable | What it adds |
| --- | --- |
| `CF_ACCOUNT_ID`, `CF_KV_NAMESPACE_ID`, `CF_API_TOKEN` | Store synced libraries in Cloudflare KV, for a hosted deploy. Upstash also works: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. |
| `QUIRE_CAPTURE_URL`, `QUIRE_CAPTURE_TOKEN` | Previews for components added by link, from the capture service in [`capture/`](capture). |
| `QUIRE_FILE_STORE=1` | Keep saving libraries in `.data/` under `npm start`. |

## Curated catalog and previews

`lib/catalog/data.json` is generated from the sources in `scripts/catalog/sources.ts`.

```bash
node scripts/build-catalog.ts            # all sites
node scripts/build-catalog.ts magicui    # one site
```

Previews come from the Quire stage in [`stage/`](stage). It installs each component's own demo from
the library's registry into a neutral Vite app, poses it, and saves stills for the light and dark theme plus a
short clip when the component moves. Files go to `public/previews/` and `lib/catalog/stage.json`; the live
demos in the cards run from the stage build in `public/stage/`. Components without a preview stay out of the gallery.

## Deploy and CI

Quire runs on Cloudflare Workers through [OpenNext](https://opennext.js.org/cloudflare).

- `npm run build` runs `opennextjs-cloudflare build`, which calls `npm run build:next` and writes the worker to `.open-next/`.
- [`wrangler.jsonc`](wrangler.jsonc) points the worker at `.open-next/worker.js` and serves static files (including `public/`) from the `ASSETS` binding.
- Cloudflare Workers Builds deploys `main` to [quire.fyi](https://quire.fyi) and builds a preview for every other branch.
- [CI](.github/workflows/ci.yml) runs on every pull request and on pushes to `main`: `npm ci`, then `npm run check` (comment check, Prettier, ESLint, type check, Vitest) step by step and the OpenNext build, on Node 24 like Workers Builds.
- Its actions are pinned to commit hashes, and [Dependabot](.github/dependabot.yml) keeps them and the npm packages current.
- Pushing a `v<version>` tag runs the [release workflow](.github/workflows/release.yml), which publishes a GitHub release with notes generated from the merged pull requests.

`package-lock.json` must install on Linux. If you regenerate it on Windows or macOS, check that `npm ci` still passes in CI.

## Tech stack

[Next.js 16](https://nextjs.org), [React 19](https://react.dev), [Tailwind CSS 4](https://tailwindcss.com), [Radix](https://www.radix-ui.com) and [cmdk](https://cmdk.paco.me), [Geist Mono](https://vercel.com/font), WebGL2 for the landing hero, and [OpenNext](https://opennext.js.org/cloudflare) on Cloudflare Workers.

## Contributing

Issues and pull requests are welcome. Run `npm run check` and `npm run build` before you open one.

The code has no comments. Names, types and small functions carry the meaning, and what the code cannot show goes in [docs/architecture.md](docs/architecture.md). `npm run check:comments` enforces it in CI; the rules for contributors and coding agents are in [AGENTS.md](AGENTS.md).

When a piece of UI has a few real states, keep them in one value, not in several flags, refs or timers that only make sense together. Name the states in a union and put each state's data on it (`{ kind: "error"; message: string }`, not `error` beside `status`); move only from the state you expect, so a late timer or a second click does nothing; and draw the transitions in [docs/architecture.md](docs/architecture.md). Examples: `lib/useIntro.ts` (the /app entrance), `components/gallery/useCardLive.ts` (a card's live demo), `SidebarEdit` in `components/app/Sidebar.tsx` and `AppDialog` in `components/App.tsx`, and the status in `components/ImportDialog.tsx`.

## License

Quire's code is [MIT](LICENSE). The component builds and previews in `public/` come from the libraries they show, under their own licences; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
