import { expect, test, type Page } from "@playwright/test";

type StoredLibrary = {
  mode?: string;
  sources?: string[];
  collections: { id: string; name: string }[];
  bookmarks: { id: string; title: string; url: string; collectionId: string | null }[];
};

const stored = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("quire:v1") ?? "null") as StoredLibrary | null);

const cards = (page: Page) => page.locator("[data-grid] > *");

const seed = (page: Page, library: StoredLibrary) =>
  page.addInitScript((lib) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("quire:v1", JSON.stringify({ version: 1, ...lib }));
      sessionStorage.setItem("seeded", "1");
    }
  }, library);

test("a new visitor starts with every curated library followed", async ({ page }) => {
  await page.goto("/app");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Starred");
  await expect.poll(async () => (await stored(page))?.mode).toBe("curated");
  expect((await stored(page))?.sources).toEqual(expect.arrayContaining(["magicui", "animate-ui"]));
});

test("starring a card saves it and Undo brings back a removed one", async ({ page }) => {
  await page.goto("/app/all-libraries/magicui");
  await expect(cards(page).first()).toBeVisible();
  const stars = page.locator("[data-grid] [data-star]");

  await stars.nth(0).click();
  await expect(page.getByRole("status")).toHaveText("Starred");
  await stars.nth(1).click();
  await stars.nth(1).click();
  await expect(page.getByRole("status")).toContainText("Removed from Starred");
  await expect.poll(async () => (await stored(page))?.bookmarks.length).toBe(1);

  await page.getByRole("status").getByRole("button", { name: "Undo" }).click();
  await expect.poll(async () => (await stored(page))?.bookmarks.length).toBe(2);
});

test("the search bar filters the view and / focuses it", async ({ page }) => {
  await page.goto("/app/all-libraries/magicui");
  await expect(cards(page).first()).toBeVisible();
  const total = await cards(page).count();

  await page.keyboard.press("/");
  await expect(page.getByRole("textbox", { name: "Search components" })).toBeFocused();
  await page.keyboard.type("marquee");
  await expect.poll(() => cards(page).count()).toBeLessThan(total);
  await expect(cards(page).first()).toContainText(/marquee/i);
});

const openCommandMenu = async (page: Page) => {
  const input = page.getByPlaceholder("Search or run a command");
  await expect(async () => {
    if (!(await input.isVisible())) await page.keyboard.press("Control+k");
    await expect(input).toBeVisible({ timeout: 1000 });
  }).toPass();
  return input;
};

test("the command menu creates a collection and opens it", async ({ page }) => {
  await page.goto("/app");
  await (await openCommandMenu(page)).fill("New collection");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Hero ideas");
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/app\/collections\/\w+/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Hero ideas");
  expect((await stored(page))?.collections.map((c) => c.name)).toEqual(["Hero ideas"]);
});

const USER_ADDS = process.env.NEXT_PUBLIC_QUIRE_USER_ADDS === "1";

test("adding by link is off unless the build turns it on", async ({ page, request }) => {
  test.skip(USER_ADDS, "this build has user adds on");
  await page.goto("/app");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Add a component or library" })).toHaveCount(0);
  await page.evaluate(() => {
    const data = new DataTransfer();
    data.setData("text/plain", "https://example.com/components/shiny-thing");
    document.body.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true }));
  });
  await page.keyboard.press("ControlOrMeta+k");
  await expect(page.getByRole("option", { name: "New collection" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Import every component from a site" })).toHaveCount(0);
  expect((await stored(page))?.bookmarks ?? []).toEqual([]);
  expect((await request.get("/api/import?url=https://magicui.design")).status()).toBe(404);
  expect((await request.get("/api/meta?url=https://magicui.design")).status()).toBe(404);
  expect((await request.get("/add?url=https://magicui.design")).status()).toBe(404);
});

test("pasting a link anywhere stars it", async ({ page }) => {
  test.skip(!USER_ADDS, "user adds are paused, see docs/user-adds.md");
  await page.goto("/app");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.evaluate(() => {
    const data = new DataTransfer();
    data.setData("text/plain", "https://example.com/components/shiny-thing");
    document.body.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true }));
  });
  await expect(page.getByRole("status")).toHaveText("Starred");
  await expect
    .poll(async () => (await stored(page))?.bookmarks.map((b) => b.url))
    .toContain("https://example.com/components/shiny-thing");
});

test("a collection lists its cards, moves with the arrow keys and asks before it is deleted", async ({ page }) => {
  await seed(page, {
    mode: "curated",
    sources: ["magicui"],
    collections: [{ id: "col1", name: "Hero" }],
    bookmarks: [1, 2, 3].map((n) => ({
      id: `b${n}`,
      title: `Thing ${n}`,
      url: `https://example.com/c/${n}`,
      library: "example.com",
      tags: [],
      collectionId: "col1",
      createdAt: n,
    })),
  });
  await page.goto("/app/collections/col1");
  await expect(cards(page)).toHaveCount(3);

  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Backspace");
  await expect.poll(async () => (await stored(page))?.bookmarks.map((b) => b.id)).toEqual(["b2", "b3"]);

  await (await openCommandMenu(page)).fill("Delete “Hero");
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("Remove “Hero”?");
  await dialog.getByRole("button", { name: "Remove" }).click();
  await expect(page).toHaveURL(/\/app$/);
  expect((await stored(page))?.collections).toEqual([]);
});

test("turning a library off on Sites removes it from the gallery", async ({ page }) => {
  await page.goto("/app/sites");
  const magic = page.getByRole("switch").first();
  await magic.click();
  await expect.poll(async () => (await stored(page))?.sources).toEqual(["animate-ui"]);
});

test("the address drives the view, including back and forward", async ({ page }) => {
  await page.goto("/app/types/button");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Button");
  await page.goto("/app/agents");
  await expect(page.getByRole("heading", { name: "Agents" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Button");
});

test("the MCP endpoint lists its tools", async ({ request }) => {
  const res = await request.post("/api/mcp", { data: { jsonrpc: "2.0", id: 1, method: "tools/list" } });
  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(body.result.tools.map((t: { name: string }) => t.name)).toContain("search_components");
});

test("a browser agent runs commands through WebMCP and cannot replace the library", async ({ page }) => {
  await page.addInitScript(() => {
    const tools: Record<string, (input: unknown) => Promise<unknown>> = {};
    Object.assign(window, { webmcp: tools });
    Object.defineProperty(document, "modelContext", {
      value: {
        registerTool: async (tool: { name: string; execute: (input: unknown) => Promise<unknown> }) => {
          tools[tool.name] = tool.execute;
        },
      },
    });
  });
  const call = (name: string, input: unknown) =>
    page.evaluate(
      ([n, i]) => (window as unknown as { webmcp: Record<string, (x: unknown) => Promise<unknown>> }).webmcp[n](i),
      [name, input] as const,
    ) as Promise<{ ok: boolean; error?: { message: string } }>;

  await page.goto("/app");
  await expect
    .poll(() => page.evaluate(() => Object.keys((window as unknown as { webmcp: object }).webmcp)))
    .toEqual(["snapshot", "act", "query"]);
  await expect.poll(async () => JSON.stringify(await call("snapshot", {}))).toContain("Open command menu");

  const go = await call("act", {
    steps: [
      { ref: "Open command menu", action: "setOpen", args: [true] },
      { ref: "Search or run a command", action: "run", args: ["new-collection"] },
    ],
  });
  expect(go.error).toBeUndefined();
  await expect(page.getByPlaceholder("Name")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect.poll(async () => JSON.stringify(await call("snapshot", {}))).toContain('"label":"Open command menu"');

  const restore = await call("act", {
    steps: [
      { ref: "Open command menu", action: "setOpen", args: [true] },
      { ref: "Search or run a command", action: "run", args: ["import-backup"] },
    ],
  });
  expect(restore.ok).toBe(false);
  expect(restore.error?.message).toContain("Replaces the library");
});
