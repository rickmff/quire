import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const VIEWS = [
  "/",
  "/app",
  "/app/all-libraries",
  "/app/all-libraries/magicui",
  "/app/types/button",
  "/app/sites",
  "/app/agents",
];

const watch = (page: Page) => {
  const problems: string[] = [];
  page.on("console", (m) => {
    const where = `${m.location().url} ${m.text()}`;
    const local = where.includes("/_vercel/") || (!process.env.QUIRE_PREVIEWS_URL && where.includes("/previews/"));
    if (m.type() === "error" && !local) problems.push(m.text());
  });
  page.on("pageerror", (e) => problems.push(e.message));
  return problems;
};

const settle = async (page: Page, path: string) => {
  await page.goto(path);
  if (path.startsWith("/app")) await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForLoadState("networkidle");
};

for (const path of VIEWS) {
  test(`${path} has no accessibility violations`, async ({ page }) => {
    await settle(page, path);
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });

  test(`${path} breaks no content security rule and logs no error`, async ({ page }) => {
    const problems = watch(page);
    await page.addInitScript(() => {
      addEventListener("securitypolicyviolation", (e) =>
        console.error(`CSP ${e.violatedDirective} blocked ${e.blockedURI || "inline"}`),
      );
    });
    await settle(page, path);
    expect(problems).toEqual([]);
  });
}

test("the skip link moves focus to the main content", async ({ page }) => {
  await settle(page, "/app/all-libraries");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});

test("each catalog page has its own title, description and canonical", async ({ page }) => {
  const seen = new Set<string>();
  for (const path of ["/app/all-libraries", "/app/all-libraries/magicui", "/app/types/button"]) {
    await page.goto(path);
    const title = await page.title();
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    const description = await page.locator('meta[name="description"]').getAttribute("content");
    expect(canonical).toBe(`https://quire.fyi${path}`);
    expect(description?.length).toBeGreaterThan(50);
    expect(seen.has(title)).toBe(false);
    seen.add(title);
  }
});

test("the catalog is cached by version and the sitemap lists the catalog pages", async ({ request, page }) => {
  const asked = page.waitForRequest((r) => r.url().includes("/api/catalog"));
  await page.goto("/app");
  const url = (await asked).url();
  expect(new URL(url).searchParams.get("v")).toBeTruthy();
  const res = await request.get(url);
  expect(res.headers()["cache-control"]).toContain("immutable");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/app/all-libraries/magicui");
  expect((await request.get("/llms.txt")).ok()).toBe(true);
  expect(await (await request.get("/.well-known/security.txt")).text()).toContain("Contact:");
});

test("the error endpoint takes a client report and refuses a broken one", async ({ request }) => {
  const ok = await request.post("/api/client-error", { data: { message: "e2e check", path: "/app", source: "e2e" } });
  expect(ok.status()).toBe(204);
  const bad = await request.post("/api/client-error", { data: { path: "https://evil.dev" } });
  expect(bad.status()).toBe(400);
});
