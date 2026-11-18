"use client";

import { SITE_URL } from "@/lib/seo";
import { useClientValue } from "@/lib/useClientValue";

const SKILL_COMMAND = "npx skills add rickmff/quire --skill quire";

export function Agents({
  syncKey,
  syncedAt,
  available,
  onEnable,
  onSyncNow,
  copy,
}: {
  syncKey?: string;
  syncedAt?: number;
  available: boolean | null;
  onEnable: () => void;
  onSyncNow: () => void;
  copy: (text: string, msg: string) => void;
}) {
  const origin = useClientValue(() => window.location.origin, SITE_URL);
  const url = `${origin}/api/mcp${syncKey ? `?key=${syncKey}` : ""}`;
  const rows = [
    { name: "Claude Code", text: `claude mcp add --transport http quire "${url}"` },
    { name: "Codex", text: `codex mcp add quire --url "${url}"` },
    { name: "Cursor, Windsurf, VS Code", text: JSON.stringify({ mcpServers: { quire: { url } } }, null, 2) },
  ];
  return (
    <section className="max-w-2xl pb-24">
      <div className="flex h-12 items-center">
        <h1 className="font-medium">Agents</h1>
      </div>
      <p className="text-muted">
        Add Quire as an MCP server. Your agent can then search components by type and motion, and read their real source
        code before it writes UI.
      </p>

      <div className="mt-6 rounded-lg p-4 ring-1 ring-line ring-inset">
        {syncKey ? (
          <>
            <p>Your library is connected.</p>
            <p className="mt-1 text-[12px] text-muted">
              The address below holds a private key. Anyone with it can read your library.
              {syncedAt ? ` Last sync ${new Date(syncedAt).toLocaleString()}.` : ""}
            </p>
            <button onClick={onSyncNow} className="mt-2 text-[12px] text-muted transition hover:text-fg">
              Sync now
            </button>
          </>
        ) : available === false ? (
          <>
            <p>The curated library is ready for agents.</p>
            <p className="mt-1 text-[12px] text-muted">
              This server has no storage set up yet, so your own library stays in this browser for now.
            </p>
          </>
        ) : (
          <>
            <p>Agents read the curated library.</p>
            <p className="mt-1 text-[12px] text-muted">
              Connect your library so they read your sites, saved components and notes instead.
            </p>
            <button onClick={onEnable} disabled={available === null} className="btn btn-primary mt-3">
              Connect my library
            </button>
          </>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {rows.map((r) => (
          <div key={r.name}>
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] text-faint">{r.name}</span>
              <button
                onClick={() => copy(r.text, "Copied")}
                className="text-[12px] text-faint transition hover:text-muted"
              >
                Copy
              </button>
            </div>
            <pre className="mt-1 overflow-x-auto rounded-md bg-field px-3 py-2 font-mono text-[11px] text-muted">
              {r.text}
            </pre>
          </div>
        ))}
      </div>

      <h2 className="mt-10 font-medium">Skill</h2>
      <p className="mt-2 text-[12px] text-muted">
        The Quire skill teaches your agent the workflow: recommend, read the real source, then build. It pairs with the
        UI SDK skill for focus, keyboard and ARIA.
      </p>
      <div className="mt-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] text-faint">Any agent</span>
          <button
            onClick={() => copy(SKILL_COMMAND, "Copied")}
            className="text-[12px] text-faint transition hover:text-muted"
          >
            Copy
          </button>
        </div>
        <pre className="mt-1 overflow-x-auto rounded-md bg-field px-3 py-2 font-mono text-[11px] text-muted">
          {SKILL_COMMAND}
        </pre>
      </div>

      <h2 className="mt-10 font-medium">In the browser</h2>
      <p className="mt-2 text-[12px] text-muted">
        Quire&apos;s controls are built on{" "}
        <a
          href="https://ui-sdk.dev"
          target="_blank"
          rel="noreferrer"
          className="text-fg underline-offset-2 hover:underline"
        >
          UI SDK
        </a>
        . In a browser with WebMCP, its agent gets <code className="text-fg">snapshot</code>,{" "}
        <code className="text-fg">query</code> and <code className="text-fg">act</code>, so it can open the command menu
        and run any command without clicking. Commands that delete or replace your library stay with you.
      </p>

      <h2 className="mt-10 font-medium">MCP tools</h2>
      <ul className="mt-2 flex flex-col gap-1.5 text-[12px] text-muted">
        <li>
          <code className="text-fg">recommend(brief)</code> picks component types from a plain brief and returns
          references for each.
        </li>
        <li>
          <code className="text-fg">search_components</code> by words, type, motion trigger, tech or site.
        </li>
        <li>
          <code className="text-fg">get_component_source(id)</code> returns the real code from the site&apos;s registry
          or repo.
        </li>
        <li>
          <code className="text-fg">get_component</code>, <code className="text-fg">get_filters</code>
          {", "}
          <code className="text-fg">list_libraries</code>.
        </li>
      </ul>
    </section>
  );
}
