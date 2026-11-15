<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/wordmark-dark.svg">
    <img src=".github/assets/wordmark-light.svg" alt="quire" height="56">
  </picture>
</p>

<p align="center">
  A reference gallery of UI components, micro-interactions and animations, organized by type, that your AI agent reads over MCP.
</p>

<p align="center">
  <a href="https://quire.fyi">Website</a> ·
  <a href="#features">Features</a> ·
  <a href="#browser-extension">Extension</a> ·
  <a href="#run-it-locally">Run locally</a> ·
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/app-dark.png">
    <img src=".github/assets/app-light.png" alt="The quire app with saved components grouped in collections" width="100%">
  </picture>
</p>

## Features

- **Curated library.** 1,796 components from 19 component sites (Magic UI, Aceternity UI, React Bits, Animate UI, Motion Primitives, Cult UI, Kokonut UI, SmoothUI, Animata and more), read from each site's registry or repo.
- **Or start from scratch.** Begin empty and paste the link of each component library you want. Quire reads its registry, pages or sitemap and adds every component.
- **Organized by type, not by site.** Every component gets a type (button, dock, text effect, background…), the motion that drives it (hover, scroll, cursor, drag, loop…) and the tech it uses (Motion, GSAP, Three.js).
- **Detail like a gallery.** Preview, credit and link to the source, install command, and the real source code.
- **MCP for agents.** `/api/mcp` serves the curated library, or your own library with your key. Tools: `recommend`, `search_components`, `get_component`, `get_component_source`, `get_filters`, `list_libraries`.
- **Collections and notes.** Save components, group them, add a note for your agent. ⌘K searches and exports.

## MCP

```bash
claude mcp add --transport http quire https://quire.fyi/api/mcp
```

Open **Agents** in the app to connect your own library. You get the same address with a private `key`.
Start an agent with a brief, for example "pricing page with a playful toggle and a magnetic button". It calls
`recommend`, then `get_component_source` for the references it adapts.

## Curated catalog

`lib/catalog/data.json` is generated. The sources live in `scripts/catalog/sources.ts`.

```bash
node scripts/build-catalog.ts            # all sites
node scripts/build-catalog.ts magicui    # one site
```

Every card in the gallery shows a preview. Previews come from the libraries' own repos where they keep them.
The rest are recorded by the capture service in [`capture/`](capture/README.md), which runs Chromium on your
computer, and saved in `public/previews/`. Components without a preview stay out of the gallery.

## Browser extension

`extension/` contains a Chrome extension (Manifest V3).

1. Open `chrome://extensions` and turn on Developer mode.
2. Click **Load unpacked** and select the `extension/` folder.
3. Click the icon or press Alt+S on a component page to save it. A page from the curated catalog keeps its source for your agent.
4. Press Alt+Shift+S, or right-click, to add the whole component library you are on.
5. On x.com, click the quire button next to X's bookmark button to save a post.

The extension saves to [quire.fyi](https://quire.fyi). To use your own instance, set its address in the extension options.

## Run it locally

Nothing to sign up for. Needs Node 20 or newer.

```bash
git clone https://github.com/rickmff/quire.git
cd quire
npm install
npm run dev
```

1. Open [localhost:3000/app](http://localhost:3000/app) and pick **Curated library** or **From scratch**.
2. Paste the link of a component library in the top field. A curated site turns on; any other site is imported.
3. Open **Agents**, click **Connect my library**, and copy the command for your agent, for example:

   ```bash
   claude mcp add --transport http quire "http://localhost:3000/api/mcp?key=<your key>"
   ```

   Without a key, the MCP serves the curated library. Synced libraries are saved in `.data/`.
4. Extension: load `extension/` in Chrome (below), open its options and set the address to `http://localhost:3000`.
5. Previews for components you add by link (optional): run the capture service on your computer, see [`capture/`](capture/README.md).

For a production build: `npm run build`, then `QUIRE_FILE_STORE=1 npm start` to keep saving libraries in `.data/`.

The link preview API (`/api/meta`) blocks private network addresses. In a sandbox without DNS, set `QUIRE_SKIP_DNS_CHECK=1` for local testing only.

### Optional services

| Variable | What it adds |
| --- | --- |
| `CF_ACCOUNT_ID`, `CF_KV_NAMESPACE_ID`, `CF_API_TOKEN` | Store synced libraries in Cloudflare KV, for a hosted deploy. Upstash also works: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. |
| `QUIRE_CAPTURE_URL`, `QUIRE_CAPTURE_TOKEN` | Previews for components added by link, from the [capture service](capture/README.md). |
| `QUIRE_FILE_STORE=1` | Keep saving libraries in `.data/` under `npm start`. |

Put them in `.env.local`. Without any of them, everything above works on your machine.

## Tech stack

[Next.js](https://nextjs.org), [React](https://react.dev), [Tailwind CSS](https://tailwindcss.com), [cmdk](https://cmdk.paco.me) and [Geist](https://vercel.com/font).

## Contributing

Issues and pull requests are welcome. For a large change, open an issue first to discuss it.
