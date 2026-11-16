# Working on Quire

## No code comments

Do not write comments in code. This covers `//` and `/* */` in TypeScript, JavaScript and CSS, JSX comments,
JSDoc, comments inside GLSL strings, `#` in shell, Python, YAML and Dockerfiles, and `<!-- -->` in HTML.
`npm run check:comments` fails on any of them, and CI runs it.

Make the code say it instead: a precise name, a named constant, a type, a small function. When something
cannot be said in code, such as why a choice was made, a value that must match another file, a state diagram,
or how to run a script, write it in `docs/architecture.md` or in the README of the folder.

Comments that tools read are allowed, and the check lets them through: `@ts-expect-error`, `@ts-ignore`,
`@ts-nocheck`, `/// <reference>`, lint and formatter directives, `@jsx` pragmas, bundler hints such as
`/*#__PURE__*/`, `webpackChunkName` and `@vite-ignore`, licence headers (`/*!`, `@license`, `@preserve`,
`SPDX-License-Identifier`, `Copyright`), and the shebang line of a script. Use them only when the tool needs them.

Do not edit generated or vendored files: `public/stage/` and `public/previews/` (built
by the stage) and lockfiles. The check skips them.

## Checks before you finish

```bash
npm run check:comments
npx tsc --noEmit
npm run build
```

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
