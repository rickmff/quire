# Changelog

Notable changes to Quire. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
versions follow [Semantic Versioning](https://semver.org). [CONTRIBUTING.md](CONTRIBUTING.md) says how a release is
cut.

## Unreleased

## 0.1.0 - 2026-11-26

The first tagged version of Quire, running on [quire.fyi](https://quire.fyi).

### Added

- A curated catalog of 214 components from Magic UI, Animate UI and Prestige UI, each with a preview and a live demo.
- Views by library, by category, by component type and by motion trigger, with search, stars, collections and notes.
- **Copy for agent** on every card, an MCP server at `/api/mcp`, and a skill: `npx skills add rickmff/quire --skill quire`.
- A page with its own title, description and canonical for each library, category and component type, a sitemap
  with all of them, and `/llms.txt`.
- Client errors are reported to `/api/client-error` and logged, and a page that breaks offers **Try again**.
- `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, issue forms, a pull request template and `docs/mcp.md`.
- CI runs the comment check, Prettier, ESLint, the type check, unit tests with coverage floors, the build,
  Playwright with axe on every main view, Lighthouse, CodeQL and `npm audit`.

### Changed

- Muted and faint text meet WCAG AA contrast, and a skip link opens every page.
- The catalog downloads once per deploy, and the landing's WebGL code loads after the first paint.

### Security

- A content security policy, HSTS with preload, `nosniff`, a referrer policy, a permissions policy and frame
  protection on every response, and `script-src-attr 'none'`.
- Rate limits on every route that fetches, writes or serves the MCP, shared through Redis when it is configured.
- Server fetches of supplied links refuse private networks and check every redirect.
- No known vulnerability in the production dependencies.
- `/.well-known/security.txt` and private vulnerability reporting.
