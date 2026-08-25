// @ts-check
/**
 * SC-012 · Project browsing (SRS-TEST-16 subset)
 * Scenario 5 — gallery + detail page + pagination.
 *
 * The gallery is a client component → its fetch can be mocked for
 * deterministic pagination/search tests. The detail page (/projects/[id]) is a
 * Next.js Server Component that fetches the backend server-side → those tests
 * hit the real seeded backend (DemoProjectSeeder).
 */
const { test, expect } = require("@playwright/test");
const {
  appPath,
  lang,
  t,
  tExact,
  makeDemoProjects,
  mockProjectsList,
  mockSearchSuggestions,
} = require("./helpers");

/** "25 مشروع" / "25 projects" — the gallery count line. */
function countText(testInfo, count) {
  return new RegExp(`${count} ${lang(testInfo) === "ar" ? "مشروع" : "projects"}`);
}

test.describe("Project browsing", () => {
  test("gallery renders seeded projects from the backend", async ({ page }, testInfo) => {
    await page.goto(appPath(testInfo, "/projects"));

    // Real backend: at least one published project (DemoProjectSeeder).
    await expect(page.locator("article").first()).toBeVisible();
    await expect(
      page.getByText(new RegExp(`\\d+ ${lang(testInfo) === "ar" ? "مشروع" : "projects"}`)).first()
    ).toBeVisible();
  });

  test("clicking a project card opens its detail page", async ({ page }, testInfo) => {
    await page.goto(appPath(testInfo, "/projects"));

    const firstCard = page.locator("article").first();
    await expect(firstCard).toBeVisible();
    const firstTitle = (await firstCard.locator("h3").first().innerText()).trim();
    expect(firstTitle.length).toBeGreaterThan(0);

    await firstCard.locator("a[href*='/projects/']").first().click();
    await expect(page).toHaveURL(/\/projects\/\d+/);

    // Server-rendered detail page shows the same title in its <h1>.
    await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(firstTitle);
  });

  test("gallery paginates with the mocked API (12 per page)", async ({ page }, testInfo) => {
    await mockProjectsList(page, { projects: makeDemoProjects(25) });
    await page.goto(appPath(testInfo, "/projects"));

    // Page 1: 12 cards + count + pagination controls.
    await expect(page.locator("article")).toHaveCount(12);
    await expect(page.getByRole("heading", { name: "Demo Project 01" })).toBeVisible();
    await expect(page.getByText(countText(testInfo, 25))).toBeVisible();

    // Go to page 2.
    await page.getByRole("button", { name: tExact(testInfo, "التالي", "Next") }).click();
    await expect(page.getByRole("heading", { name: "Demo Project 13" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Demo Project 01" })).not.toBeVisible();
  });

  test("gallery search filters the results", async ({ page }, testInfo) => {
    await mockProjectsList(page, { projects: makeDemoProjects(10) });
    await mockSearchSuggestions(page);
    await page.goto(appPath(testInfo, "/projects"));

    await page.getByLabel(t(testInfo, "البحث في المشاريع", "Search projects")).fill("Demo Project 03");

    // Debounce (300ms) then re-fetch with ?q=… — only the match remains.
    await expect(page.getByRole("heading", { name: "Demo Project 03" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Demo Project 02" })).not.toBeVisible();
  });
});
