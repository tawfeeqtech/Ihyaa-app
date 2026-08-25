// @ts-check
/**
 * SC-012 · Investor flow (SRS-TEST-14 subset)
 * Scenario 3 — OAuth (fake) ← role selection ← browse projects ← open details.
 *
 * OAuth is fully mocked (no real Google/GitHub/LinkedIn call — Constitution
 * says OAuth tests must not make external requests). The second test browses
 * the real seeded backend (DemoProjectSeeder) because the project detail page
 * is a Next.js Server Component that fetches server-side and cannot be mocked
 * with page.route.
 */
const { test, expect } = require("@playwright/test");
const {
  appPath,
  t,
  addAuthCookies,
  mockOAuth,
  mockInvestorDashboard,
} = require("./helpers");

test.describe("Investor flow", () => {
  test("investor completes fake OAuth, picks the investor role and lands on the investor dashboard", async ({ page }, testInfo) => {
    await mockOAuth(page, { provider: "google", name: "سارة المستثمرة", role: "investor" });
    await mockInvestorDashboard(page);

    await page.goto(appPath(testInfo, "/login"));

    // Click the Google OAuth button — the mock returns a redirect_url pointing
    // back at the app callback with temp params (role_required=1).
    await page.getByRole("button", { name: new RegExp("Google") }).click();

    // Callback → select-role screen.
    await expect(page.getByRole("heading", { name: t(testInfo, "اختر دورك", "Choose your role") })).toBeVisible();

    // Default role is idea_owner — pick investor. Anchor the label match to the
    // start: the unanchored /مستثمر/ also matches the idea-owner card's
    // description ("...عرضه على المستثمرين"), which is a strict-mode violation.
    await page.getByRole("radio", { name: t(testInfo, "^مستثمر", "^Investor") }).click();
    await page.getByRole("button", { name: t(testInfo, "متابعة", "Continue") }).click();

    // Lands on the investor dashboard.
    await expect(page).toHaveURL(/\/dashboard\/investor/);
    await expect(
      page.getByRole("heading", { name: t(testInfo, "لوحة المستثمر", "Investor dashboard") })
    ).toBeVisible();
  });

  test("investor browses the public gallery and opens a project detail", async ({ page, request }, testInfo) => {
    // Authed as an investor so the detail page also demonstrates the
    // authenticated disclosure view.
    await addAuthCookies(page.context(), { role: "investor", name: "Investor Demo" });
    await mockInvestorDashboard(page);

    // Discover a real seeded project id via the API (server-side request).
    const res = await request.get("http://localhost:8000/api/projects?per_page=5");
    const body = await res.json();
    const projects = body?.data?.data ?? body?.data ?? [];
    expect(Array.isArray(projects) && projects.length).toBeGreaterThan(0);

    // Browse the gallery (client component → real backend fetch).
    await page.goto(appPath(testInfo, "/projects"));
    await expect(page.locator("article").first()).toBeVisible();

    const firstTitle = (await page.locator("article h3").first().innerText()).trim();
    expect(firstTitle.length).toBeGreaterThan(0);

    // Open the first project's detail page (server component → real backend).
    await page.locator("article").first().locator("a[href*='/projects/']").first().click();
    await expect(page).toHaveURL(/\/projects\/\d+/);

    // The detail page renders the same title in its <h1>.
    await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(firstTitle);
  });
});
