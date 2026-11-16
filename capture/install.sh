#!/usr/bin/env bash
set -euo pipefail
DOMAIN="${DOMAIN:?Set DOMAIN, e.g. DOMAIN=capture.example.com}"
DIR=/opt/quire

if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
command -v git >/dev/null || (apt-get update -y && apt-get install -y git)

if [ -d "$DIR/.git" ]; then git -C "$DIR" pull --ff-only; else git clone --depth 1 https://github.com/rickmff/quire "$DIR"; fi
cd "$DIR/capture"

if [ ! -f .env ]; then
  TOKEN=$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')
  sed -e "s|^DOMAIN=.*|DOMAIN=$DOMAIN|" -e "s|^PUBLIC_URL=.*|PUBLIC_URL=https://$DOMAIN|" -e "s|^CAPTURE_TOKEN=.*|CAPTURE_TOKEN=$TOKEN|" .env.example > .env
fi

if command -v ufw >/dev/null && ufw status | grep -q active; then ufw allow 80,443/tcp; fi

docker compose --env-file .env up -d --build
echo
echo "Capture service: https://$DOMAIN/health"
echo "Put these in Quire's environment variables:"
echo "  QUIRE_CAPTURE_URL=https://$DOMAIN"
echo "  QUIRE_CAPTURE_TOKEN=$(grep ^CAPTURE_TOKEN= .env | cut -d= -f2)"
