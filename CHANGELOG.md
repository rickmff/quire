# Changelog

Notable changes to Quire. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
versions follow [Semantic Versioning](https://semver.org). [CONTRIBUTING.md](CONTRIBUTING.md) explains how a
release is cut.

## Unreleased

### Added

- `CONTRIBUTING.md`, `SECURITY.md` and this changelog.
- Dependabot updates for npm packages and GitHub Actions, and a release workflow that publishes a GitHub release
  from a version tag.
- ESLint, Prettier and Vitest, with `npm run check` running every check at once.

### Changed

- GitHub Actions are pinned to full commit hashes.
- The code has no comments; `npm run check:comments` enforces it and `docs/architecture.md` holds the reasons.

## 0.1.0 - 2026-11-16

The first public version, running on [quire.fyi](https://quire.fyi).

### Added

- A curated catalog of 166 components from Magic UI and Animate UI, each with a still, a clip and a live demo.
- Views by library, by component type and by motion trigger, with search, stars, collections and notes.
- Adding one component or a whole library by link, read from its registry, its pages or its sitemap.
- **Copy for agent** on every card, and an MCP server at `/api/mcp` for the curated catalog or a synced library.
- A Chrome extension to save the page you are on, or the library it belongs to.
- Deploys to Cloudflare Workers through OpenNext.
