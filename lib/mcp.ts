import { catalog, facets, libraries, libraryName, readBrief, scope, search, typeById } from "./catalog";
import type { CatalogComponent, SyncedLibrary } from "./catalog/schema";
import { triggerById } from "./motion";
import { readSource } from "./source";

// A Model Context Protocol server over Streamable HTTP, without an SDK.
// It answers JSON-RPC with plain JSON responses (no SSE stream), which the
// spec allows and every major client accepts. Every tool is read-only.

const VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

export const MOTION_GUIDANCE =
  "Motion rules: micro-interactions 120-250ms, larger transitions 250-500ms. Ease-out for things that enter, ease-in for things that leave, springs for drag and physical feedback. Animate transform and opacity, not layout. Every animation honors prefers-reduced-motion. One signature motion per screen; keep the rest quiet.";

const INSTRUCTIONS = `Quire is a reference gallery of real UI components, micro-interactions and animations from ${catalog.libraries.length} component libraries${""}. Before you build UI, call recommend(brief) or search_components to find real references, then get_component_source(id) to read the actual code and adapt it. Prefer the install command when the user's project uses shadcn. Credit the source library. ${MOTION_GUIDANCE}`;

type Ctx = { user: SyncedLibrary | null; base: string };

function card(c: CatalogComponent) {
  return {
    id: c.id,
    title: c.title,
    library: libraryName(c),
    type: typeById(c.type).name,
    ...(c.triggers.length ? { motion: c.triggers.map((t) => triggerById(t)?.name ?? t) } : {}),
    ...(c.tech.length ? { tech: c.tech } : {}),
    ...(c.description ? { description: c.description } : {}),
    ...(c.note ? { note: c.note } : {}),
    docs: c.docs,
    ...(c.install ? { install: c.install } : {}),
  };
}

function full(c: CatalogComponent, base: string) {
  return {
    ...card(c),
    ...(c.category ? { siteCategory: c.category } : {}),
    ...(c.dependencies?.length ? { dependencies: c.dependencies } : {}),
    ...(c.preview ? { preview: c.preview.startsWith("/") ? `${base}${c.preview}` : c.preview } : {}),
    sourceAvailable: Boolean(c.item || (c.repo && c.files?.length)),
  };
}

const str = { type: "string" } as const;
const filterProps = {
  type: { type: "string", description: "Component type id from get_filters, e.g. button, navbar, text-effect." },
  trigger: { type: "string", description: "Motion trigger id: hover, click, scroll, cursor, drag, typing, entrance, loop, state." },
  tech: { type: "string", description: "Animation tech: Motion, GSAP, Three.js, WebGL, Lottie, React Spring, Matter.js." },
  library: { type: "string", description: "Library id or name from list_libraries." },
};

const TOOLS = [
  {
    name: "recommend",
    description:
      "Start here. Give a plain-language brief (what you are building and the feel you want). Returns the component types it reads from the brief, the best real references for each, and motion rules. Then call get_component_source on the ones you use.",
    inputSchema: {
      type: "object",
      properties: { brief: { ...str, description: "e.g. 'pricing page with a playful toggle and a hover effect on cards'" }, perType: { type: "number" } },
      required: ["brief"],
    },
  },
  {
    name: "search_components",
    description: "Search components, micro-interactions and animations by words and filters. Returns compact cards.",
    inputSchema: {
      type: "object",
      properties: { query: { ...str, description: "Words, e.g. 'magnetic button', 'text scramble', 'dock'." }, ...filterProps, limit: { type: "number", description: "Max 50, default 12." } },
    },
  },
  {
    name: "get_component",
    description: "Full record of one component: description, motion, tech, dependencies, docs link, install command.",
    inputSchema: { type: "object", properties: { id: { ...str, description: "Component id, e.g. magicui/magic-card." } }, required: ["id"] },
  },
  {
    name: "get_component_source",
    description: "The real source code of a component, read from its library's registry or GitHub repo. Use it to adapt the interaction, not to copy blindly.",
    inputSchema: { type: "object", properties: { id: str }, required: ["id"] },
  },
  {
    name: "get_filters",
    description: "Every valid filter value with counts: types (grouped by family), motion triggers, tech and libraries.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_libraries",
    description: "The component libraries in this gallery, with links and counts.",
    inputSchema: { type: "object", properties: {} },
  },
];

const text = (value: unknown, isError = false) => ({
  content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 1) }],
  ...(isError ? { isError: true } : {}),
});

async function callTool(name: string, args: any, ctx: Ctx) {
  const items = scope(ctx.user);
  const find = (id: string) => items.find((c) => c.id === id) ?? catalog.components.find((c) => c.id === id);

  switch (name) {
    case "recommend": {
      const brief = String(args?.brief ?? "").slice(0, 500);
      if (!brief.trim()) return text("Pass a brief, e.g. 'landing hero with an animated headline and a glowing button'.", true);
      const per = Math.max(1, Math.min(Number(args?.perType) || 4, 8));
      const read = readBrief(brief);
      const trigger = read.triggers[0];
      // Spread references across sites: at most two from one library.
      const spread = (list: CatalogComponent[]) => {
        const seen = new Map<string, number>();
        return list.filter((c) => {
          const n = (seen.get(c.library) ?? 0) + 1;
          seen.set(c.library, n);
          return n <= 2;
        });
      };
      const groups = read.types.map((type) => {
        let r = search(items, { query: brief, type, trigger, limit: 50 });
        if (r.items.length < per) r = search(items, { query: brief, type, limit: 50 });
        if (!r.items.length) r = search(items, { type, limit: 50 });
        return { type: typeById(type).name, typeId: type, references: spread(r.items).slice(0, per).map(card) };
      });
      const loose = groups.length ? [] : search(items, { query: brief, trigger, limit: per * 2 }).items.map(card);
      return text({
        read: { types: read.types, motion: read.triggers },
        ...(groups.length ? { groups } : { references: loose }),
        motionGuidance: MOTION_GUIDANCE,
        next: "Call get_component_source(id) for the references you adapt. Use search_components to widen.",
      });
    }
    case "search_components": {
      const r = search(items, { ...args, limit: Number(args?.limit) || 12 });
      return text({ total: r.total, items: r.items.map(card) });
    }
    case "get_component": {
      const c = find(String(args?.id ?? ""));
      return c ? text(full(c, ctx.base)) : text(`No component ${args?.id}. Use search_components to find ids.`, true);
    }
    case "get_component_source": {
      const c = find(String(args?.id ?? ""));
      if (!c) return text(`No component ${args?.id}.`, true);
      const src = await readSource(c);
      if (!src) return text({ id: c.id, docs: c.docs, install: c.install, note: "Source not readable from here. Open the docs link or run the install command." });
      return text({ id: c.id, title: c.title, library: libraryName(c), from: src.from, install: c.install, dependencies: src.dependencies ?? c.dependencies, files: src.files });
    }
    case "get_filters":
      return text(facets(items));
    case "list_libraries": {
      const own = ctx.user ? new Set(ctx.user.sources) : null;
      const count = new Map<string, number>();
      for (const c of items) count.set(c.library, (count.get(c.library) ?? 0) + 1);
      return text(
        [...count].map(([id, n]) => {
          const l = libraries.find((x) => x.id === id);
          return l ? { id, name: l.name, url: l.url, about: l.blurb, components: n, followed: own ? own.has(id) : true } : { id, name: id, components: n, personal: true };
        }),
      );
    }
  }
  return null;
}

type Rpc = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: any };

export async function handleRpc(msg: Rpc, ctx: Ctx) {
  const reply = (result: unknown) => ({ jsonrpc: "2.0", id: msg.id ?? null, result });
  const fail = (code: number, message: string) => ({ jsonrpc: "2.0", id: msg.id ?? null, error: { code, message } });
  switch (msg.method) {
    case "initialize": {
      const asked = msg.params?.protocolVersion;
      return reply({
        protocolVersion: VERSIONS.includes(asked) ? asked : VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "quire", title: "Quire", version: "0.2.0" },
        instructions: INSTRUCTIONS + (ctx.user ? " You are reading the user's personal library." : " You are reading the curated starter library."),
      });
    }
    case "ping":
      return reply({});
    case "tools/list":
      return reply({ tools: TOOLS.map((t) => ({ ...t, annotations: { readOnlyHint: true, openWorldHint: t.name === "get_component_source" } })) });
    case "tools/call": {
      const out = await callTool(msg.params?.name, msg.params?.arguments ?? {}, ctx);
      return out ? reply(out) : fail(-32602, `Unknown tool ${msg.params?.name}`);
    }
    case "resources/list":
      return reply({ resources: [] });
    case "prompts/list":
      return reply({ prompts: [] });
  }
  if (msg.method?.startsWith("notifications/")) return null;
  return fail(-32601, `Method not found: ${msg.method}`);
}
