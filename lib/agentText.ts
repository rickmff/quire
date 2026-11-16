import { typeById } from "@/lib/types";

// The agent-ready description of a component, copied by "Copy for agent" on
// the drawer and on every card. One builder, so they always match.
export function agentText(
  item: { id: string; title: string; type: string; description?: string; docs: string; install?: string },
  site: string,
) {
  return [
    `${item.title} (${site}), ${typeById(item.type).name}.`,
    item.description,
    `Reference: ${item.docs}`,
    item.install && `Install: ${item.install}`,
    !item.id.startsWith("mine/") && `Quire id: ${item.id} (get_component_source in the Quire MCP returns its code)`,
  ]
    .filter(Boolean)
    .join("\n");
}
