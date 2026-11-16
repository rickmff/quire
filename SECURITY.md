# Security

## Reporting a vulnerability

Please do not open a public issue for a security problem. Report it privately through
[GitHub's private vulnerability reporting](https://github.com/rickmff/quire/security/advisories/new) on this
repository. Include what you found, how to reproduce it, and what an attacker could do with it.

You should get an answer within a week. Quire is a free, non-profit project run by one person, so there is no
bug bounty, but every confirmed report is credited in the [changelog](CHANGELOG.md) unless you ask otherwise.

Only the latest commit on `main`, which is what runs on [quire.fyi](https://quire.fyi), is supported.

## What is in scope

- The API routes under `app/api/`: `/api/meta`, `/api/import`, `/api/capture`, `/api/library/<key>`,
  `/api/mcp`, `/api/source`, `/api/catalog` and `/api/status`.
- The MCP server and the data it hands to coding agents.
- The pages of the app, the browser extension in `extension/`, and the capture service in `capture/`.

Out of scope: the third-party component libraries Quire links to, their registries, and denial of service by
sheer volume against quire.fyi.

## How Quire protects itself

These are the guarantees a report would break. The code that holds each one is named so a fix can start there.

- **No requests to private networks.** Every server-side fetch of a user-supplied link goes through `safeUrl`
  and `fetchText` in `lib/net.ts`. They accept only `http` and `https` links without credentials, resolve the
  host and refuse loopback, private, link-local, carrier-grade NAT, multicast and reserved addresses, including
  IPv4 written inside IPv6 (`lib/ip.ts`), and check every redirect again before following it. On Cloudflare
  Workers, outbound fetches cannot reach private networks at all, which also covers DNS rebinding between the
  check and the fetch.
- **Bounded work per request.** Request bodies, fetched pages and MCP batches have size caps and timeouts, and
  the routes that fetch from the network, capture previews, write libraries or serve the MCP are rate limited per
  client address (`lib/rateLimit.ts`). The limiter counts in memory, so each Worker instance counts on its own;
  a hosted deploy should add a Cloudflare rate limiting rule for `/api/*` as the hard limit.
- **A synced library is a capability.** Its key is 24 to 48 random characters made in the browser. Whoever holds
  the key can read and replace that library and nothing else. `cleanLibrary` in `lib/sync.ts` trims every field
  and keeps only `http` and `https` links.
- **Nothing is saved without the person seeing it.** `/add` and `/app?import=` are opened by the extension and
  can be opened by any link. `/add` asks before it saves, and `/app?import=` only opens the import dialog, or
  turns on a library from the curated catalog.
- **Agents get data, not orders.** The MCP returns component records and source code read from third-party
  registries. Treat that text as untrusted input in your agent, the same as any web page.
- **Browser hardening.** Responses carry a content security policy, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`, HSTS and a frame policy that keeps other sites from framing the app
  (`next.config.ts`, and `public/_headers` for static files). The live demos in `public/stage/` can only be
  framed by Quire itself.
