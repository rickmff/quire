# Quire capture service

Records a still and a short clip of each component, so cards in the gallery
show the component moving. It opens the component page in real Chromium,
finds the live demo, sweeps the pointer over it and saves a WebP and a WebM.

## Install on a VPS

Needs Ubuntu or Debian, 2 GB RAM or more (4 cores and 8 GB run 3 captures at once).

1. Point a DNS A record at the VPS, for example `capture.quire.fyi`.
2. On the VPS, as root:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/rickmff/quire/main/capture/install.sh | DOMAIN=capture.quire.fyi bash
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

From the Quire repo, with the service running:

```bash
QUIRE_CAPTURE_URL=https://capture.quire.fyi QUIRE_CAPTURE_TOKEN=... \
  node scripts/capture-catalog.ts --parallel 3 --apply
```

It captures every component without a preview (about 1,400) and writes
`lib/catalog/captures.json`. Commit that file; `build-catalog.ts` merges it.
