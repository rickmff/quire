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
