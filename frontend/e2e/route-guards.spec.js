// @ts-check
/**
 * SC-012 · Route guards (SC-005 subset)
 * Scenario 4 — cross-role access + guest → login?next=…
 *
 * Guard behaviour is implemented in src/middleware.js:
 *  - guest → protected          → /{locale}/login?next={path}
 *  - authed → auth page         → /{locale}/dashboard/{role}
 *  - idea_owner ↔ investor dash → role dashboard + ?error=unauthorized_role
 *  - bare /dashboard            → /{locale}/dashboard/{role}
 */
const { test, expect } = require("@playwright/test");
const {
  appPath,
  lang,
  t,
  addAuthCookies,
  mockOwnerDashboard,
  mockInvestorDashboard,
} = require("./helpers");

test.describe("Route guards", () => {
  test("guest is sent to login with next for /dashboard/owner", async ({ page }, testInfo) => {
    await page.goto(appPath(testInfo, "/dashboard/owner"));
    // The middleware encodes the next path: ?next=%2Fdashboard%2Fowner.
    await expect(page).toHaveURL(new RegExp(`/${lang(testInfo)}/login\\?next=%2Fdashboard%2Fowner`));
  });

  test("guest is sent to login with next for /projects/new", async ({ page }, testInfo) => {
    await page.goto(appPath(testInfo, "/projects/new"));
    await expect(page).toHaveURL(new RegExp(`/${lang(testInfo)}/login\\?next=%2Fprojects%2Fnew`));
  });

  test("guest is sent to login for /profile (protected prefix)", async ({ page }, testInfo) => {
    await page.goto(appPath(testInfo, "/profile"));
    await expect(page).toHaveURL(new RegExp(`/${lang(testInfo)}/login\\?next=%2Fprofile`));
  });

  test("idea owner cannot open the investor dashboard (US-006)", async ({ page }, testInfo) => {
    await addAuthCookies(page.context(), { role: "idea_owner", name: "خالد العتيبي" });
    await mockOwnerDashboard(page);

    await page.goto(appPath(testInfo, "/dashboard/investor"));
    // DashboardErrorToast strips ?error=unauthorized_role via history.replaceState
    // after surfacing the toast, so accept the URL with or without the param.
    await expect(page).toHaveURL(new RegExp(`/${lang(testInfo)}/dashboard/owner(\\?error=unauthorized_role)?$`));
    // The toast renders into two <role=status> regions — assert the first.
    await expect(
      page.getByText(t(testInfo, "ليس لديك صلاحية الوصول إلى هذه الصفحة", "You do not have permission to access this page")).first()
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /لوحة صاحب الفكرة|Idea owner dashboard/ })
    ).toBeVisible();
  });

  test("investor cannot open the owner dashboard (US-006)", async ({ page }, testInfo) => {
    await addAuthCookies(page.context(), { role: "investor", name: "Investor Demo" });
    await mockInvestorDashboard(page);

    await page.goto(appPath(testInfo, "/dashboard/owner"));
    // Same param-strip caveat as the owner test above.
    await expect(page).toHaveURL(new RegExp(`/${lang(testInfo)}/dashboard/investor(\\?error=unauthorized_role)?$`));
    // Same two-status-region caveat as the owner test above.
    await expect(
      page.getByText(t(testInfo, "ليس لديك صلاحية الوصول إلى هذه الصفحة", "You do not have permission to access this page")).first()
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /لوحة المستثمر|Investor dashboard/ })
    ).toBeVisible();
  });

  test("authed idea owner visiting /login is sent to the owner dashboard", async ({ page }, testInfo) => {
    await addAuthCookies(page.context(), { role: "idea_owner", name: "خالد العتيبي" });
    await mockOwnerDashboard(page);

    await page.goto(appPath(testInfo, "/login"));
    await expect(page).toHaveURL(new RegExp(`/${lang(testInfo)}/dashboard/owner`));
  });

  test("bare /dashboard redirects to the role dashboard", async ({ page }, testInfo) => {
    await addAuthCookies(page.context(), { role: "idea_owner", name: "خالد العتيبي" });
    await mockOwnerDashboard(page);

    await page.goto(appPath(testInfo, "/dashboard"));
    await expect(page).toHaveURL(new RegExp(`/${lang(testInfo)}/dashboard/owner`));
  });
});
