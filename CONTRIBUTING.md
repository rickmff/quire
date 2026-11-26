# Contributing to Quire

Thanks for helping. Small fixes are as welcome as features.

## Before you start

- **Bug:** open an issue with the steps, what you expected and what happened.
- **Large change** (a new view, a data source, a change to the MCP tools): open an issue first, so we agree on the
  shape before you write it.
- **Security problem:** do not open an issue. Follow [SECURITY.md](SECURITY.md).
- Issues marked [`good first issue`](https://github.com/rickmff/quire/labels/good%20first%20issue) are a good start.

## Set up

You need Node 20 or newer. No account, key or database is needed.

```bash
git clone https://github.com/rickmff/quire.git
cd quire
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000). Every variable in [.env.example](.env.example) is optional; the README
says what each one turns on.

## How the code is written

- **No code comments.** Names, types and small functions carry the meaning. What the code cannot say goes in
  [docs/architecture.md](docs/architecture.md). `npm run check:comments` fails on a comment, so CI fails too.
- **Explicit states.** A part of the UI with a few real states keeps them in one value of a named union.
  `lib/useIntro.ts` is the model.
- **Untrusted links.** Server code that fetches a link a person supplied goes through `fetchText` or `safeUrl` in
  `lib/net.ts`, never a bare `fetch`.
- **Accessible by default.** What works with a mouse works with the keyboard, focus stays visible, and motion
  respects `prefers-reduced-motion`. The end-to-end tests run axe on every view.
- **Same look, same behavior.** A refactor does not change what the person sees.

[AGENTS.md](AGENTS.md) maps where each part of the code lives.

## Checks

Run these before you push. CI runs the same commands on every pull request.

```bash
npm run check
npm run build
npm run test:e2e
```

`npm run check` runs the comment check, Prettier, ESLint, the type check and the unit tests. `npm run format` fixes
formatting.

## Pull requests

- One change per pull request, with a title that says what it does for the person using Quire.
- Add tests for logic you add or fix in `lib/`, `app/api/` and the hooks in `components/`.
- Add a line under **Unreleased** in [CHANGELOG.md](CHANGELOG.md) for anything a user would notice.
- Add a screenshot or a short clip for anything visual.

Every pull request gets a Vercel preview. `main` deploys to [quire.fyi](https://quire.fyi).

## Releases

Quire follows [Semantic Versioning](https://semver.org). Below 1.0, a minor version adds features or changes the MCP
tools, and a patch version fixes.

1. Move the **Unreleased** entries in `CHANGELOG.md` under a new version heading with the date.
2. Run `npm version <version> --no-git-tag-version`.
3. Commit, tag the commit `v<version>` and push the tag. The [release workflow](.github/workflows/release.yml)
   checks the tag against `package.json` and publishes the GitHub release.

## License

By contributing you agree that your contribution is released under the [MIT license](LICENSE).
