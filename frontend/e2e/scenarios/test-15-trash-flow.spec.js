// @ts-check
/**
 * SC-012 · Test-15 trash flow (US-055 · T075/T076/T077)
 *
 * The /trash page is a Server Component fed by GET /api/trashed-projects. On
 * the E2E backend the auth token is synthetic, so the SSR fetch 401s and the
 * widget renders the empty state — the deterministic UI shell covered here:
 *  - the middleware guards /trash (guest → login?next=/trash),
 *  - the idea owner sees the page header + the «سلة المهملات» nav entry,
 *  - the empty state offers «العودة إلى اللوحة» back to the dashboard.
 *
 * The restore / force-delete mutations (T076) require a real trashed project
 * and are exercised by the backend integration suite (trash feature tests) —
 * the E2E backend does not seed trash data.
 */
const { test, expect } = require("@playwright/test");
const { appPath, lang, t, tExact, addAuthCookies } = require("../helpers");

test.describe("Trash flow (US-055 · T077)", () => {
  test("guest is sent to login for /trash", async ({ page }, testInfo) => {
    await page.goto(appPath(testInfo, "/trash"));
    // The middleware encodes the next path: ?next=%2Ftrash (URLSearchParams).
    await expect(page).toHaveURL(new RegExp(`/${lang(testInfo)}/login\\?next=%2Ftrash`));
  });

  test("owner sees the trash page header, subtitle and empty state", async ({ page }, testInfo) => {
    await addAuthCookies(page.context(), { role: "idea_owner", name: "خالد العتيبي" });
    await page.goto(appPath(testInfo, "/trash"));

    // Anchored — the empty-state title «سلة المهملات فارغة» contains the same
    // words, so an unanchored name regex would match 2 headings.
    await expect(
      page.getByRole("heading", { name: tExact(testInfo, "سلة المهملات", "Trash") })
    ).toBeVisible();
    await expect(
      page.getByText(
        t(
          testInfo,
          "المشاريع المحذوفة تبقى هنا 30 يوماً ثم تُحذف نهائياً",
          "Deleted projects stay here for 30 days, then are permanently deleted"
        )
      )
    ).toBeVisible();
    await expect(page.getByText(t(testInfo, "سلة المهملات فارغة", "Trash is empty"))).toBeVisible();
  });

  test("sidebar exposes the trash entry for the idea owner", async ({ page }, testInfo) => {
    await addAuthCookies(page.context(), { role: "idea_owner", name: "خالد العتيبي" });
    await page.goto(appPath(testInfo, "/dashboard/owner"));
    await expect(page.getByRole("link", { name: t(testInfo, "سلة المهملات", "Trash") })).toBeVisible();
  });

  test("empty-state back button returns to the owner dashboard", async ({ page }, testInfo) => {
    await addAuthCookies(page.context(), { role: "idea_owner", name: "خالد العتيبي" });
    await page.goto(appPath(testInfo, "/trash"));
    // The empty-state CTA is a next-intl <Link href="/dashboard/owner"> wrapping
    // a <Button>; click the anchor (the element that owns the navigation) rather
    // than the inner button, which is more robust across hydration.
    await page.getByRole("link", { name: t(testInfo, "العودة إلى اللوحة", "Back to dashboard") }).click();
    // The SPA push to /dashboard/owner pays a cold-compile cost on the dev
    // server under the suite's parallel workers — allow it to settle.
    await expect(page).toHaveURL(new RegExp(`/${lang(testInfo)}/dashboard/owner$`), { timeout: 15_000 });
  });
});
