// @ts-check
/**
 * EPIC-08 · Agreement viewer (US-045 / T056)
 *
 * The agreement page is a client component, so both of its fetches are mocked:
 *   - GET /api/agreements/7/meta  → JSON agreement metadata (parties + emails)
 *   - GET /api/agreements/7       → raw PDF bytes (blob preview + download)
 * The page requires auth (middleware protects /agreements), so an authed
 * cookie is set up front.
 */
const { test, expect } = require("@playwright/test");
const { appPath, t, envelope, jsonResponse, addAuthCookies, mockApi } = require("./helpers");

test.describe("Agreement viewer", () => {
  test("renders parties, counterpart emails and a PDF preview/download", async ({ page, context }, testInfo) => {
    await mockApi(page, "GET", "agreements/7/meta", async (route) => {
      await route.fulfill(
        jsonResponse(
          envelope({
            id: 7,
            project: { id: 3, title: "مشروع التجارة الإلكترونية" },
            idea_owner_name: "صاحب الفكرة",
            idea_owner_email: "owner@example.com",
            investor_name: "المستثمر",
            investor_email: "investor@example.com",
            created_at: "2026-08-10T09:00:00Z",
            pdf_url: "http://localhost:8000/storage/agreements/7.pdf",
          })
        )
      );
    });

    await page.route("**/api/agreements/7", async (route) => {
      if (route.request().method() !== "GET") return route.continue();
      await route.fulfill({
        status: 200,
        contentType: "application/pdf",
        body: Buffer.from(
          "%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n2 0 obj\n<</Type/Pages/Kids[]>>\nendobj\ntrailer\n<</Root 1 0 R>>\n%%EOF",
          "utf8"
        ),
      });
    });

    await addAuthCookies(context, { role: "idea_owner", name: "صاحب المشروع" });
    await page.goto(appPath(testInfo, "/agreements/7"));

    await expect(
      page.getByRole("heading", { name: t(testInfo, "اتفاقية التعاون", "Collaboration agreement") })
    ).toBeVisible();

    // Parties + counterpart emails (both parties are on the agreement).
    await expect(page.getByText(/مشروع التجارة الإلكترونية/).first()).toBeVisible();
    await expect(page.getByText(/owner@example\.com/).first()).toBeVisible();
    await expect(page.getByText(/investor@example\.com/).first()).toBeVisible();
    await expect(page.getByText(/صاحب الفكرة/).first()).toBeVisible();
    await expect(page.getByText(/المستثمر/).first()).toBeVisible();

    // The PDF preview + download button become available once the blob loads.
    await expect(page.getByRole("button", { name: t(testInfo, "تحميل PDF", "Download PDF") })).toBeVisible();
    await expect(page.locator("iframe[src^='blob:']")).toBeVisible();
  });
});
