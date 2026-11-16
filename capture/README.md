# Quire capture service

## Run it on your computer

Needs Node 20 or newer.

```bash
cd capture
npm install
npx playwright install chromium
cp .env.example .env        # then set CAPTURE_TOKEN to any long string
npm start
```

Then add to Quire's `.env.local`:

```
QUIRE_CAPTURE_URL=http://localhost:8080
QUIRE_CAPTURE_TOKEN=<the same token>
```

Media is saved in `capture/media/` and served at `http://localhost:8080/media/`.

Records a still and a short clip of each component, so cards in the gallery
show the component moving. It opens the component page in real Chromium,
finds the live demo, sweeps the pointer over it and saves a WebP and a WebM.

## Install on a server (optional)

Needs Ubuntu or Debian, 2 GB RAM or more (4 cores and 8 GB run 3 captures at once).

1. Point a DNS A record at the VPS, for example `capture.example.com`.
2. On the VPS, as root:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/rickmff/quire/main/capture/install.sh | DOMAIN=capture.example.com bash
   ```

   The script installs Docker if needed, clones the repo to `/opt/quire`, writes
   `.env` with a random token, and starts the service behind Caddy (HTTPS).
3. Copy the two values it prints into Quire's environment variables:
   `QUIRE_CAPTURE_URL` and `QUIRE_CAPTURE_TOKEN`.

Update later with the same command. Media lives in the `media` Docker volume.

## Configuration

`server.mjs` reads `.env` next to it, so it runs the same with or without Docker.

| Variable | Default | What it does |
| --- | --- | --- |
| `CAPTURE_TOKEN` | required | Bearer token for `POST /capture` |
| `PUBLIC_URL` | `http://localhost:<PORT>` | Base of the media URLs it returns |
| `PORT` | `8080` | Port to listen on |
| `MEDIA_DIR` | `capture/media` (`/data/media` in Docker) | Where stills and clips are saved |
| `CONCURRENCY` | `2` | Captures run at once |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | unset | With all five set, files go to a Cloudflare R2 bucket and the returned URLs point at `R2_PUBLIC_URL`. The local disk is then only a cache. `R2_ENDPOINT` overrides the bucket endpoint. |
| `ALLOW_PRIVATE` | unset | `1` lets it capture private network addresses. For local testing only. |

The Docker image is based on Playwright's, which brings Chromium and its system libraries. `compose.yml` runs
the service with Caddy in front of it for HTTPS, with a certificate from Let's Encrypt.

## API

| Call | What it does |
| --- | --- |
| `POST /capture` `{"url": "...", "video": true}` with `Authorization: Bearer <token>` | Captures once per URL, then returns the cached files: `{ "image": ".../media/<id>.webp", "video": ".../media/<id>.webm" }` |
| `GET /media/<id>.webp` | Public, cached for a year |
| `GET /health` | Running and queued captures |

Private addresses are refused, so the token cannot be used to reach your network.

## Fill the curated catalog

From the Quire repo, with the service running on your computer:

```bash
node scripts/capture-catalog.ts --parallel 3
```

It reads the token from `capture/.env` and captures every component without a
preview. Each still is saved into `public/previews/<library>/<name>.webp`, so it
ships with the site and needs no server. `lib/catalog/captures.json` maps ids to
those files; `build-catalog.ts` merges it on every build.

Pages that cannot be captured (404, blank demo, timeout) go to
`lib/catalog/no-preview.json` with the reason. The gallery leaves components
without a preview out; the MCP still serves them. `--retry` tries them again,
`--library <id>` limits the run to one site, `--video` also keeps clips.
Commit `public/previews/`, `captures.json`, `no-preview.json` and `data.json`.
