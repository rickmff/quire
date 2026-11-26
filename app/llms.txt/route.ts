import { catalog } from "@/lib/catalog";
import { galleryPages, libraryNames } from "@/lib/pages";
import { DESCRIPTION, SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

export function GET() {
  const pages = galleryPages();
  const libraries = catalog.libraries.map((l) =>
    `- [${l.name}](${SITE_URL}/app/all-libraries/${l.id}): ${l.count} components. ${l.blurb ?? ""}`.trimEnd(),
  );
  const types = pages
    .filter((p) => p.path.startsWith("/app/types/"))
    .map((p) => `- [${p.title}](${SITE_URL}${p.path}): ${p.items.length}`);
  const body = [
    "# Quire",
    "",
    `> ${DESCRIPTION}`,
    "",
    `The catalog holds ${catalog.components.length} components from ${libraryNames()}. Agents read it over MCP at ${SITE_URL}/api/mcp (streamable HTTP, no key needed). Start with the \`recommend\` tool, then read real code with \`get_component_source\`.`,
    "",
    "## Use it",
    "",
    `- MCP server: ${SITE_URL}/api/mcp`,
    "- Claude Code: `claude mcp add --transport http quire https://quire.fyi/api/mcp`",
    "- Skill: `npx skills add rickmff/quire --skill quire`",
    "- [MCP tools](https://github.com/rickmff/quire/blob/main/docs/mcp.md)",
    `- [Catalog as JSON](${SITE_URL}/api/catalog)`,
    "",
    "## Libraries",
    "",
    ...libraries,
    "",
    "## Component types",
    "",
    ...types,
    "",
    "## Optional",
    "",
    "- [Source code](https://github.com/rickmff/quire)",
    "",
  ].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
