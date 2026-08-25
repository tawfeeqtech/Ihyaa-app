// @ts-check
/**
 * EPIC-11 · Saved projects (US-059 / T094/T095/T096/T097)
 *
 * The project detail page renders against the real seeded backend
 * (DemoProjectSeeder → published projects 1..12), so we read a real project id
 * from a gallery card and drive the save loop through the real UI:
 *
 *   1) Save from the detail page (POST /projects/{id}/save) → button flips to
 *      "محفوظ" (real state, not a fake local toggle).
 *   2) Idempotent duplicate: clicking again unsaves (DELETE) and flips back.
 *   3) Re-save, then the investor dashboard shows the saved project row.
 *   4) One-click remove on the dashboard → row disappears → empty state.
 *
 * Client-side API calls are statefully mocked (savedList closure) so the
 * dashboard aggregate always reflects the current saved set.
 */
const { test, expect } = require("@playwright/test");
const {
  appPath,
  t,
  tExact,
  addAuthCookies,
  mockApi,
  mockMe,
  envelope,
  jsonResponse,
} = require("../helpers");

/** Open the gallery, return the first real project's { id, title }. */
async function openRealProject(page, testInfo) {
  await page.goto(appPath(testInfo, "/projects"));
  const firstCard = page.locator("article").first();
  await expect(firstCard).toBeVisible();
  const href = await firstCard
    .locator("a[href*='/projects/']")
    .first()
    .getAttribute("href");
  const id = href.split("/").filter(Boolean).pop();
  const title = (await firstCard.locator("h3").first().innerText()).trim();
  return { id, title };
}

test.describe("Saved projects (US-059)", () => {
  test("save from detail → appears on dashboard → remove → empty state", async ({ page, context }, testInfo) => {
    const { id, title } = await openRealProject(page, testInfo);
    const numId = Number(id);

    // Stateful saved set shared by all mocks.
    let savedList = [];

    // Mock /api/me so AuthProvider's boot revalidation does NOT 401-evict the
    // synthetic auth cookies (the real backend rejects `e2e-token-123`), which
    // would otherwise turn the dashboard navigation into a login redirect.
    await mockMe(page, { role: "investor", name: "مستثمر تجريبي" });

    // GET /saved-projects — the ProjectDetail useSavedStatus source of truth.
    await mockApi(page, "GET", "saved-projects", async (route) => {
      await route.fulfill(
        jsonResponse({
          success: true,
          message: "ok",
          data: savedList,
          meta: { current_page: 1, per_page: 100, total: savedList.length, last_page: 1 },
        })
      );
    });

    // POST + DELETE /projects/{id}/save — ONE route with a method switch.
    // Two routes sharing the same pathname predicate would shadow each other:
    // Playwright tries routes in reverse registration order, and a handler's
    // `route.continue()` sends the request STRAIGHT to the network instead of
    // falling through to the older route — so a DELETE route registered after a
    // POST route swallows POST requests (and vice versa).
    await mockApi(page, null, `projects/${id}/save`, async (route) => {
      const method = route.request().method();
      if (method === "POST") {
        // Idempotent create (201).
        savedList = [
          {
            saved_id: 1,
            saved_at: new Date().toISOString(),
            project: {
              id: numId,
              title,
              category: "التقنية المالية",
              status: "needs_funding",
              ai_score: 78,
              cover_image_url: null,
              available: true,
            },
          },
        ];
        await route.fulfill(jsonResponse(envelope({ id: numId }, "saved"), 201));
      } else if (method === "DELETE") {
        // Idempotent remove.
        savedList = [];
        await route.fulfill(jsonResponse(envelope({ removed: true })));
      } else {
        return route.continue();
      }
    });

    // GET /dashboard/investor — the aggregate reads the current saved set.
    await mockApi(page, "GET", "dashboard/investor", async (route) => {
      await route.fulfill(
        jsonResponse(
          envelope({
            kpis: {
              sent_requests: 0,
              accepted_requests: 0,
              followed_projects: savedList.length,
            },
            profile_complete: true,
            suggestions: [],
            sent_interests: [],
            saved_projects: savedList,
            updates_feed: [],
          })
        )
      );
    });

    // Add auth as investor (after reading the gallery, like interest.spec.js).
    await addAuthCookies(context, { role: "investor", name: "مستثمر تجريبي" });

    // ── 1) Save from the detail page ──
    await page.goto(appPath(testInfo, `/projects/${id}`));
    const saveBtn = page.getByRole("button", { name: tExact(testInfo, "حفظ", "Save") });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();
    await expect(
      page.getByRole("button", { name: tExact(testInfo, "محفوظ", "Saved") })
    ).toBeVisible();

    // ── 2) Idempotent duplicate: clicking again unsaves ──
    await page.getByRole("button", { name: tExact(testInfo, "محفوظ", "Saved") }).click();
    await expect(saveBtn).toBeVisible();

    // ── 3) Re-save, then verify it appears on the dashboard ──
    await saveBtn.click();
    await expect(
      page.getByRole("button", { name: tExact(testInfo, "محفوظ", "Saved") })
    ).toBeVisible();

    await page.goto(appPath(testInfo, "/dashboard/investor"));
    const savedRow = page.getByTestId("saved-project-row");
    await expect(savedRow).toBeVisible();
    await expect(savedRow).toContainText(title);

    // ── 4) One-click remove → row disappears → empty state ──
    await page
      .getByRole("button", { name: t(testInfo, "إزالة من المحفوظات", "Remove from saved") })
      .click();
    await expect(savedRow).toHaveCount(0);
    await expect(
      page.getByText(tExact(testInfo, "لا توجد مشاريع محفوظة", "No saved projects"))
    ).toBeVisible();
  });
});
