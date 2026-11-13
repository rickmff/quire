<img src="app/icon.svg" width="40" alt="quire">

# quire

Save components from any UI library, organize them into collections, and hand them to your AI agent.

The landing page is at `/` and the app is at `/app`.

## Features

- **Save links.** Paste a component URL anywhere in the app (⌘V) to add it as a card with title, description and preview image.
- **Library detection.** quire recognizes 24 sources, including shadcn/ui, Magic UI, Aceternity UI, 21st.dev and React Bits. For shadcn registries it adds the `npx shadcn add` command.
- **Collections.** Group cards in the sidebar. Drag a card onto a collection to move it. Double-click a collection to rename it.
- **Notes.** Add a note to each card for your agent.
- **Command palette.** ⌘K searches every card, filters by library, and exports a collection as Markdown or JSON for an AI agent.
- **Keyboard.** Arrows or `h` `j` `k` `l` to move, `Enter` to open, `c` to copy, `Backspace` to delete.
- **Local first.** Data stays in your browser. Export and import JSON backups from ⌘K.

## Browser extension

`extension/` contains a Chrome extension (Manifest V3).

1. Open `chrome://extensions` and turn on Developer mode.
2. Click **Load unpacked** and select the `extension/` folder.
3. Click the icon or press Alt+S on any page to save it.
4. On x.com, click the quire button next to X's bookmark button to save a post. The card keeps the post text and first image.

Set your quire address in the extension options. A bookmarklet in the app sidebar does the same job without the extension.

## Development

```bash
npm install
npm run dev
```

Built with Next.js, React and Tailwind CSS.

The link preview API (`/api/meta`) blocks private network addresses. In a sandbox without DNS, set `QUIRE_SKIP_DNS_CHECK=1` for local testing only.
