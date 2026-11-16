# Contributing to Quire

Thanks for helping. Quire is a free, open source, non-profit gallery, and small fixes are as welcome as features.

## Before you start

- For a bug, open an issue with the steps to reproduce it, what you expected, and what happened.
- For a large change, such as a new view, a new data source or a change to the MCP tools, open an issue first so
  we can agree on the shape before you write it.
- For a security problem, do not open an issue. Follow [SECURITY.md](SECURITY.md).

## Set up

You need Node 20 or newer and nothing else: no accounts, keys or database.

```bash
git clone https://github.com/rickmff/quire.git
cd quire
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000). The README covers the optional services, the curated catalog and
the preview stage.

## How the code is written

- **No code comments.** Names, types and small functions carry the meaning. What the code cannot say, such as
  why a choice was made or which values must match across files, goes in [docs/architecture.md](docs/architecture.md)
  or in the README of the folder. `npm run check:comments` enforces it. [AGENTS.md](AGENTS.md) lists the
  exceptions tools need.
- **Explicit states.** When a piece of UI has a few real states, keep them in one value of a named union, move
  only from the state you expect, and draw the transitions in `docs/architecture.md`. `lib/useIntro.ts` is the
  model to copy.
- **Untrusted links.** Any server code that fetches a link a person or a page supplied goes through `fetchText`
  or `safeUrl` in `lib/net.ts`, never through a bare `fetch`.
- **Accessible by default.** Everything that works with a mouse works with the keyboard, focus stays visible,
  text meets WCAG AA contrast in both themes, and motion respects `prefers-reduced-motion`.
- **Same look, same behavior.** A refactor must not change what the person sees. If a fix needs a visible change,
  say so in the pull request.

## Checks

Run the full set before you push. CI runs the same commands on every pull request.

```bash
npm run check
npm run build
```

`npm run check` runs the comment check, Prettier, ESLint, the type check and the Vitest tests. `npm run format`
fixes formatting.

`package-lock.json` must install on Linux. If you change dependencies on Windows or macOS and `npm ci` fails in
CI, regenerate the lockfile on Linux or in a container.

## Pull requests

- Keep one change per pull request, with a title that says what it does for the person using Quire.
- Add tests for logic you add or fix in `lib/` and `app/api/`.
- Add a line under **Unreleased** in [CHANGELOG.md](CHANGELOG.md) for anything a user or a self-hoster would notice.
- Screenshots or a short clip help for anything visual, in the light and the dark theme.

Every branch gets a Cloudflare preview build, and `main` deploys to [quire.fyi](https://quire.fyi).

## Releases

Quire follows [Semantic Versioning](https://semver.org) while it is below 1.0: a minor version for new features
or changes to the MCP tools, a patch version for fixes.

1. Move the **Unreleased** entries in `CHANGELOG.md` under a new version heading with today's date.
2. Set the same version in `package.json` with `npm version <version> --no-git-tag-version`.
3. Commit, then tag the commit `v<version>` and push the tag.

The [release workflow](.github/workflows/release.yml) checks that the tag matches `package.json` and publishes a
GitHub release with that version's changelog entry.

## Licence

By contributing you agree that your contribution is released under the [MIT licence](LICENSE).
