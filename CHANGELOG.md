# Changelog

Notable changes to Quire. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
versions follow [Semantic Versioning](https://semver.org). [CONTRIBUTING.md](CONTRIBUTING.md) explains how a
release is cut.

## Unreleased

### Added

- `CONTRIBUTING.md`, `SECURITY.md` and this changelog.
- Tests for the private network check, the redirect handling and the rate limiter.
- Dependabot updates for npm packages and GitHub Actions, and a release workflow that publishes a GitHub release
  from a version tag.
- ESLint, Prettier and Vitest, with `npm run check` running every check at once.

### Changed

- Saving a page from the extension now asks for one click (**Save**, or Enter) before it changes the library, so a
  link from another site cannot add to it silently.
- GitHub Actions are pinned to full commit hashes.
- The code has no comments; `npm run check:comments` enforces it and `docs/architecture.md` holds the reasons.

### Security

- `/api/meta` checks every redirect against the private network list instead of following redirects blindly.
- The private address list covers every reserved IPv4 range and IPv4 written inside IPv6 (mapped, NAT64, 6to4).
- Fetched pages are read up to a byte limit instead of in full.
- Rate limits on `/api/meta`, `/api/import`, `/api/capture`, `/api/library` writes and `/api/mcp`, and at most
  20 calls per MCP batch.
- A content security policy, HSTS, `nosniff`, a referrer policy, a permissions policy and frame protection on
  every response.
- Storage errors no longer leak their message from `/api/library`.

## 0.1.0 - 2026-11-16

The first public version, running on [quire.fyi](https://quire.fyi).

### Added

- A curated catalog of 166 components from Magic UI and Animate UI, each with a still, a clip and a live demo.
- Views by library, by component type and by motion trigger, with search, stars, collections and notes.
- Adding one component or a whole library by link, read from its registry, its pages or its sitemap.
- **Copy for agent** on every card, and an MCP server at `/api/mcp` for the curated catalog or a synced library.
- A Chrome extension to save the page you are on, or the library it belongs to.
- Deploys to Cloudflare Workers through OpenNext.
