# Design Lib

Bookmark UI components from every library, organize them, and hand them to your AI agent.

Free and open source under the MIT license.

## What works today

- Paste any component link (or press Cmd+V anywhere) to save it as a card.
- Known libraries are detected automatically. shadcn/ui, Magic UI and Aceternity links get their `npx shadcn add` command.
- Collections in a sidebar. Drag a card onto a collection to move it.
- Cmd+K to search everything.
- Notes on each card, written for your agent.
- "Copy as Markdown" turns a collection into a brief any AI agent can build from.
- A bookmarklet ("Save to Design Lib") saves the page you are on.
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

The link preview API refuses private network addresses. In a sandbox without DNS, set `DESIGNLIB_SKIP_DNS_CHECK=1` for local testing only.
