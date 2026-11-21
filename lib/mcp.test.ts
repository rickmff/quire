import { describe, expect, it } from "vitest";
import { handleRpc } from "./mcp";

const ctx = { user: null, base: "https://quire.fyi" };
const call = (method: string, params?: object) => handleRpc({ jsonrpc: "2.0", id: 1, method, params }, ctx);
const textOf = (reply: unknown) =>
  JSON.parse((reply as { result: { content: { text: string }[] } }).result.content[0].text);

describe("handleRpc", () => {
  it("answers initialize with a supported protocol version", async () => {
    const reply = await call("initialize", { protocolVersion: "1999-01-01" });
    expect(reply).toMatchObject({ id: 1, result: { serverInfo: { name: "quire" } } });
  });

  it("lists the read-only tools", async () => {
    const reply = (await call("tools/list")) as { result: { tools: { name: string; annotations: object }[] } };
    const names = reply.result.tools.map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(["recommend", "search_components", "get_component_source"]));
    expect(reply.result.tools.every((t) => "readOnlyHint" in t.annotations)).toBe(true);
  });

  it("searches the catalog and ignores filters that are not text", async () => {
    const found = textOf(await call("tools/call", { name: "search_components", arguments: { query: "globe" } }));
    expect(found.items[0].title.toLowerCase()).toContain("globe");
    const loose = textOf(await call("tools/call", { name: "search_components", arguments: { query: 5 } }));
    expect(loose.total).toBeGreaterThan(0);
  });

  it("filters by engine and offers the UI SDK parts to rebuild with", async () => {
    const radix = textOf(await call("tools/call", { name: "search_components", arguments: { engine: "Radix" } }));
    expect(radix.total).toBeGreaterThan(0);
    expect(radix.items.every((i: { engine: string }) => i.engine === "Radix")).toBe(true);
    const one = textOf(
      await call("tools/call", { name: "get_component", arguments: { id: "animate-ui/components-radix-dialog" } }),
    );
    expect(one.rebuildWithUiSdk.imports).toContain("@ui-sdk/react/dialog");
    const filters = textOf(await call("tools/call", { name: "get_filters", arguments: {} }));
    expect(filters.engines.map((e: { id: string }) => e.id)).toContain("radix");
  });

  it("asks for a brief before recommending", async () => {
    const reply = (await call("tools/call", { name: "recommend", arguments: {} })) as { result: { isError?: boolean } };
    expect(reply.result.isError).toBe(true);
  });

  it("reports unknown tools, unknown methods and invalid messages", async () => {
    expect(await call("tools/call", { name: "nope" })).toMatchObject({ error: { code: -32602 } });
    expect(await call("nope")).toMatchObject({ error: { code: -32601 } });
    expect(await handleRpc(null, ctx)).toMatchObject({ error: { code: -32600 } });
  });

  it("stays silent for notifications", async () => {
    expect(await call("notifications/initialized")).toBeNull();
  });
});
