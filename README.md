# quire

Bookmark UI components from every library, organize them, and hand them to your AI agent.

Free and open source under the MIT license.

## What works today

- Paste any component link (or press Cmd+V anywhere) to save it as a card.
- Known libraries are detected automatically. shadcn/ui, Magic UI and Aceternity links get their `npx shadcn add` command.
- Collections in a sidebar. Drag a card onto a collection to move it. Double-click a collection to rename it.
- Cmd+K to search everything.
- Notes on each card, written for your agent.
- Cmd+K → "Copy as Markdown for an AI agent" turns a collection into a brief any agent can build from. Export and import backups live there too.
- A bookmarklet ("Save to quire") saves the page you are on.
- Data lives in your browser (localStorage). Download or import JSON to back it up.

## Roadmap

1. Accounts and sync (Postgres).
2. Browser extension with per-library parsers and screenshots.
3. Remote MCP server so Claude, Cursor and others can read your collections.
4. Each collection as a shadcn registry namespace.

## Develop

```bash
npm install
npm run dev
```

The link preview API refuses private network addresses. In a sandbox without DNS, set `QUIRE_SKIP_DNS_CHECK=1` for local testing only.

## Browser extension

`extension/` is a small Chrome extension (Manifest V3). Load it unpacked from `chrome://extensions`. Click the icon or press Alt+S on any page to save it to quire. Set your quire address in the extension options.
