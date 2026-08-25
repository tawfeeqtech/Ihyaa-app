// @ts-check
/**
 * SC-16 · Re-evaluation flow → investor updates feed (US-060 / T101/T102)
 *
 * When an evaluation on an engaged project completes with a new score, the
 * investor's dashboard `updates_feed` surfaces an `evaluation_updated` event;
 * a content edit surfaces a `project_edited` event. This spec drives the
 * dashboard against a mocked aggregate and asserts the derived Arabic copy:
 *
 *   1) evaluation_updated → «تغيّرت درجة التقييم من {old} إلى {new}»
 *   2) project_edited      → «حدّث صاحب المشروع بياناته»
 *   3) zero events         → «لا توجد تحديثات بعد» + CTA «تصفح المشاريع»
 *
 * The whole dashboard reads one GET /dashboard/investor call, so each scenario
 * is just a different `overrides.updates_feed` payload (dashboard-api.md §2).
 */
const { test, expect } = require("@playwright/test");
const {
  appPath,
  t,
  tExact,
  addAuthCookies,
  mockInvestorDashboard,
} = require("../helpers");

const UPDATED_AT = new Date(Date.UTC(2026, 7, 20, 10, 0, 0)).toISOString();

test.describe("Investor updates feed (US-060)", () => {
  test("shows evaluation and edit updates with derived Arabic copy", async ({ page, context }, testInfo) => {
    await addAuthCookies(context, { role: "investor", name: "مستثمر تجريبي" });
    await mockInvestorDashboard(page, {
      projects: [],
      overrides: {
        kpis: { sent_requests: 1, accepted_requests: 0, followed_projects: 1 },
        updates_feed: [
          {
            id: "ev-3",
            type: "evaluation_updated",
            project: { id: 3, title: "مشروع التقنية المالية" },
            detail: null,
            old_score: 62,
            new_score: 78,
            created_at: UPDATED_AT,
          },
          {
            id: "pr-4",
            type: "project_edited",
            project: { id: 4, title: "مشروع التعليم الذكي" },
            detail: null,
            old_score: null,
            new_score: null,
            created_at: UPDATED_AT,
          },
        ],
      },
    });

    await page.goto(appPath(testInfo, "/dashboard/investor"));

    // Feed heading.
    await expect(
      page.getByText(tExact(testInfo, "تحديثات مشاريعك المتابعة", "Updates on your followed projects"))
    ).toBeVisible();

    // evaluation_updated → derived from old/new scores.
    await expect(
      page.getByText(tExact(testInfo, "تغيّرت درجة التقييم من 62 إلى 78", "Evaluation score changed from 62 to 78"))
    ).toBeVisible();

    // project_edited → static copy.
    await expect(
      page.getByText(tExact(testInfo, "حدّث صاحب المشروع بياناته", "The owner updated this project"))
    ).toBeVisible();

    // Both project titles link through.
    await expect(page.getByRole("link", { name: /مشروع التقنية المالية/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /مشروع التعليم الذكي/ })).toBeVisible();
  });

  test("shows the empty state with a browse CTA when there are no updates", async ({ page, context }, testInfo) => {
    await addAuthCookies(context, { role: "investor", name: "مستثمر تجريبي" });
    await mockInvestorDashboard(page, {
      projects: [],
      overrides: { updates_feed: [] },
    });

    await page.goto(appPath(testInfo, "/dashboard/investor"));

    await expect(
      page.getByText(tExact(testInfo, "لا توجد تحديثات بعد", "No updates yet"))
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: tExact(testInfo, "اكتشف مشاريع جديدة", "Discover new projects") })
    ).toBeVisible();
  });
});
