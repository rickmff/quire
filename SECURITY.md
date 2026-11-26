# Security

## Report a vulnerability

Do not open a public issue. Report it privately through
[GitHub's private vulnerability reporting](https://github.com/rickmff/quire/security/advisories/new). Say what you
found, how to reproduce it and what an attacker could do with it.

You get an answer within a week. Quire is run by one person, so there is no bug bounty. Every confirmed report is
credited in the [changelog](CHANGELOG.md) unless you ask otherwise.

Only the latest commit on `main`, which runs on [quire.fyi](https://quire.fyi), is supported.

## Scope

- The API routes under `app/api/` and the MCP server at `/api/mcp`.
- The pages of the app, the extension in `extension/` and the capture service in `capture/`.

Out of scope: the third-party libraries in the catalog, their registries, and denial of service by volume.

## What Quire guarantees

A report breaks one of these. The code that holds each one is named, so a fix can start there.

- **No requests to private networks.** Every server fetch of a supplied link goes through `safeUrl` and `fetchText`
  in `lib/net.ts`. They refuse private, loopback, link-local and reserved addresses (`lib/ip.ts`) and check every
  redirect again.
- **Bounded work per request.** Bodies, fetched pages and MCP batches have size caps and timeouts. Routes are rate
  limited per client (`lib/rateLimit.ts`), in Redis when it is configured and in memory otherwise.
- **A synced library is a capability.** Its key is 24 to 48 random characters. The key reads and replaces that
  library and nothing else (`lib/sync.ts`).
- **Nothing is saved without the person seeing it.** `/add` asks before it saves.
- **Agents get data, not orders.** The MCP returns records and source from third-party registries. Treat that
  text as untrusted input.
- **Browser hardening.** Every response carries a content security policy, HSTS, `nosniff`, a referrer policy, a
  permissions policy and a frame policy (`next.config.ts`).
