// @ts-check
/**
 * EPIC-10 · Dashboard quick actions (US-054 · T066/T068/T069)
 *
 * The owner dashboard is a Server Component: on the E2E backend the auth token
 * is synthetic, so the SSR aggregate 401s and the widgets render their empty
 * fallbacks — which is exactly what makes these tests deterministic:
 *  - QuickActions (client) always renders its three destinations (T066).
 *  - With zero projects the mini-card grid yields to the «أضف أول مشروع» CTA
 *    that stays the prominent primary action (T069).
 *  - On narrow viewports the actions stack full-width, no overflow (T068).
 *
 * Clicks are asserted by URL / href only — /projects/new is gated by الدستور V
 * (verified email) at the middleware, so it is never clicked through.
 */
const { test, expect } = require("@playwright/test");
const { appPath, lang, t, addAuthCookies, mockMe } = require("../helpers");

test.describe("Dashboard quick actions", () => {
  // AuthProvider re-validates the token via GET /me on boot. The E2E token is
  // synthetic → a real /me returns 401 → the session is evicted (الدستور V) and
  // the NEXT navigation bounces to login (see T047 which navigates twice).
  // Mocking /me keeps the restored cookie state intact across navigations.
  test.beforeEach(async ({ page }) => {
    await mockMe(page);
  });

  test("owner dashboard renders the three quick actions + the four KPI labels (T066)", async ({ page }, testInfo) => {
    await addAuthCookies(page.context(), { role: "idea_owner", name: "خالد العتيبي" });
    await page.goto(appPath(testInfo, "/dashboard/owner"));

    await expect(
      page.getByRole("heading", { name: t(testInfo, "لوحة صاحب الفكرة", "Idea owner dashboard") })
    ).toBeVisible();

    const add = page.getByRole("link", { name: t(testInfo, "إضافة مشروع جديد", "Add new project") });
    const view = page.getByRole("link", { name: t(testInfo, "عرض كل المشاريع", "View all projects") });
    const manage = page.getByRole("link", { name: t(testInfo, "إدارة الطلبات", "Manage requests") });
    await expect(add).toBeVisible();
    await expect(view).toBeVisible();
    await expect(manage).toBeVisible();

    // Destinations point at the right routes (locale-prefixed).
    await expect(add).toHaveAttribute("href", /\/projects\/new$/);
    await expect(view).toHaveAttribute("href", /\/projects$/);
    await expect(manage).toHaveAttribute("href", /\/interests\/received$/);

    // US-052 — the four KPI widgets render their labels.
    await expect(page.getByText(t(testInfo, "عدد المشاريع", "Total projects"))).toBeVisible();
    await expect(page.getByText(t(testInfo, "متوسط التقييم", "Average score"))).toBeVisible();
    await expect(page.getByText(t(testInfo, "طلبات الاهتمام الواردة", "Interests received"))).toBeVisible();
    await expect(page.getByText(t(testInfo, "الطلبات المقبولة", "Accepted requests"))).toBeVisible();
  });

  test("clicking the secondary quick actions navigates to their pages", async ({ page }, testInfo) => {
    await addAuthCookies(page.context(), { role: "idea_owner", name: "خالد العتيبي" });
    await page.goto(appPath(testInfo, "/dashboard/owner"));

    // «عرض كل المشاريع» → the public gallery. 15s: the SPA push pays a
    // cold-compile cost on the dev server under the suite's parallel workers.
    await page.getByRole("link", { name: t(testInfo, "عرض كل المشاريع", "View all projects") }).click();
    await expect(page).toHaveURL(new RegExp(`/${lang(testInfo)}/projects$`), { timeout: 15_000 });

    // «إدارة الطلبات» → the received-interests board.
    await page.goto(appPath(testInfo, "/dashboard/owner"));
    await page.getByRole("link", { name: t(testInfo, "إدارة الطلبات", "Manage requests") }).click();
    await expect(page).toHaveURL(new RegExp(`/${lang(testInfo)}/interests/received$`), { timeout: 15_000 });
  });

  test("quick actions stack full-width on narrow screens (T068)", async ({ page }, testInfo) => {
    await addAuthCookies(page.context(), { role: "idea_owner", name: "خالد العتيبي" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(appPath(testInfo, "/dashboard/owner"));

    const add = page.getByRole("link", { name: t(testInfo, "إضافة مشروع جديد", "Add new project") });
    const view = page.getByRole("link", { name: t(testInfo, "عرض كل المشاريع", "View all projects") });
    const manage = page.getByRole("link", { name: t(testInfo, "إدارة الطلبات", "Manage requests") });

    const a = await add.boundingBox();
    const b = await view.boundingBox();
    const c = await manage.boundingBox();
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(c).not.toBeNull();

    // Same column, same full width (w-full), stacked top-to-bottom.
    expect(a.x).toBeCloseTo(b.x, 0);
    expect(b.x).toBeCloseTo(c.x, 0);
    expect(a.y).toBeLessThan(b.y);
    expect(b.y).toBeLessThan(c.y);
    expect(a.width).toBeGreaterThan(300);
  });

  test("with zero projects the add-first-project CTA stays the primary action (T069)", async ({ page }, testInfo) => {
    await addAuthCookies(page.context(), { role: "idea_owner", name: "خالد العتيبي" });
    await page.goto(appPath(testInfo, "/dashboard/owner"));

    await expect(page.getByText(t(testInfo, "لا توجد مشاريع بعد", "No projects yet"))).toBeVisible();

    const cta = page.getByRole("link", { name: t(testInfo, "أضف أول مشروع", "Add your first project") });
    await expect(cta).toBeVisible();
    // Still wired to the new-project route (middleware gates it behind a
    // verified email — الدستور V — so only the href is asserted).
    await expect(cta).toHaveAttribute("href", /\/projects\/new$/);
  });
});
