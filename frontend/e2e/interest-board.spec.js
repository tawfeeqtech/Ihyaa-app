// @ts-check
/**
 * EPIC-08 · Interest boards (US-046 / T063)
 *
 * Both boards are client components, so their API calls can be mocked for
 * deterministic cards/counters/filters/pagination tests:
 *   - /interests/received (idea-owner only) — investor name, interest type,
 *     investor email disclosed only when accepted (الدستور §I), rejection
 *     reason, investor-cancelled note, combinable status filter.
 *   - /interests/sent (investor only) — project title, 12-per-page pagination,
 *     cancel flow with confirmation dialog.
 */
const { test, expect } = require("@playwright/test");
const {
  appPath,
  t,
  tExact,
  envelope,
  jsonResponse,
  addAuthCookies,
  mockApi,
} = require("./helpers");

const ZERO_COUNTERS = { total: 0, pending: 0, accepted: 0, rejected: 0, cancelled: 0 };

const INVESTORS = [
  { id: 101, name: "أحمد السالم" },
  { id: 102, name: "سارة المطيري" },
  { id: 103, name: "خالد العتيبي" },
];

/** One received-interest row (the shape mapApiInterest consumes). */
function makeReceived(i, overrides = {}) {
  return {
    id: i,
    investor: INVESTORS[(i - 1) % INVESTORS.length],
    project: { id: 7 + (i % 3), title: `مشروع ${i}`, ai_score: 60 + i },
    interest_type: "investment",
    message: `رسالة رقم ${i}`,
    status: "pending",
    rejection_reason: null,
    created_at: "2026-08-01T10:00:00Z",
    agreement: null,
    emails: {},
    ...overrides,
  };
}

/** One sent-interest row (the shape mapApiInterest consumes). */
function makeSent(i, overrides = {}) {
  return {
    id: i,
    project: { id: 20 + i, title: `مشروع ${i}`, ai_score: 50 + (i % 40) },
    interest_type: "investment",
    message: `رسالة للمشروع ${i}`,
    status: "pending",
    created_at: "2026-08-01T10:00:00Z",
    emails: {},
    can_cancel: true,
    ...overrides,
  };
}

/**
 * Mock GET /api/interests/received with status-filter support so the board's
 * combinable filter bar can be tested deterministically.
 */
async function mockReceivedBoard(page, { items = [], counters = ZERO_COUNTERS } = {}) {
  await mockApi(page, "GET", "interests/received", async (route) => {
    const url = new URL(route.request().url());
    const status = url.searchParams.get("status");
    let data = items;
    if (status) {
      const wanted = new Set(status.split(","));
      data = items.filter((i) => wanted.has(i.status));
    }
    const perPage = 12;
    const total = data.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    await route.fulfill(
      jsonResponse({
        success: true,
        message: "ok",
        data,
        meta: { current_page: 1, per_page: perPage, total, last_page: lastPage },
        counters: { ...ZERO_COUNTERS, ...counters },
      })
    );
  });
}

/**
 * Mock GET /api/interests/sent (paginated + status filter) and
 * DELETE /api/interests/{id} for the cancel flow.
 */
async function mockSentBoard(page, { items = [], counters = ZERO_COUNTERS } = {}) {
  // Playwright dispatches routes in REVERSE registration order (last-registered
  // wins first) and route.continue() does NOT fall through to earlier routes.
  // The broad DELETE interests/* must therefore be registered BEFORE the specific
  // GET interests/sent, otherwise a GET /interests/sent request would hit the
  // DELETE matcher first (it matches [^/]* = "sent"), continue() to the real
  // backend, and 401. Register the specific pattern LAST so it wins.
  await mockApi(page, "DELETE", "interests/*", async (route) => {
    const id = Number(route.request().url().split("/").pop());
    await route.fulfill(jsonResponse(envelope({ id, status: "cancelled" })));
  });

  await mockApi(page, "GET", "interests/sent", async (route) => {
    const url = new URL(route.request().url());
    const pageNo = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const status = url.searchParams.get("status");
    let data = items;
    if (status) {
      const wanted = new Set(status.split(","));
      data = items.filter((i) => wanted.has(i.status));
    }
    const perPage = 12;
    const total = data.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const currentPage = Math.min(pageNo, lastPage);
    const slice = data.slice((currentPage - 1) * perPage, currentPage * perPage);
    await route.fulfill(
      jsonResponse({
        success: true,
        message: "ok",
        data: slice,
        meta: { current_page: currentPage, per_page: perPage, total, last_page: lastPage },
        counters: { ...ZERO_COUNTERS, ...counters },
      })
    );
  });
}

test.describe("Received interest board (idea owner)", () => {
  test("lists requests with counters, disclosures and the investor-cancelled note", async ({ page, context }, testInfo) => {
    const items = [
      makeReceived(1, { investor: INVESTORS[0], status: "pending" }),
      makeReceived(2, {
        investor: INVESTORS[1],
        status: "accepted",
        emails: { investor_email: "sara@example.com" },
        agreement: { id: 5 },
      }),
      makeReceived(3, {
        investor: INVESTORS[2],
        status: "rejected",
        rejection_reason: "البيانات المالية غير مكتملة",
      }),
      makeReceived(4, {
        investor: { id: 104, name: "نورة القحطاني" },
        status: "cancelled",
      }),
    ];
    const counters = { total: 4, pending: 1, accepted: 1, rejected: 1, cancelled: 1 };

    await mockReceivedBoard(page, { items, counters });
    await addAuthCookies(context, { role: "idea_owner", name: "صاحب المشروع" });
    await page.goto(appPath(testInfo, "/interests/received"));

    await expect(
      page.getByRole("heading", { name: t(testInfo, "طلبات الاهتمام الواردة", "Received interest requests") })
    ).toBeVisible();

    // Counter widgets (5) — the pending one reads 1.
    await expect(page.locator('[role="listitem"]')).toHaveCount(5);
    await expect(
      page
        .locator('[role="listitem"]')
        .filter({ hasText: t(testInfo, "معلق", "Pending") })
        .getByText("1", { exact: true })
    ).toBeVisible();

    // Investor names.
    await expect(page.getByText(/أحمد السالم/)).toBeVisible();
    await expect(page.getByText(/سارة المطيري/)).toBeVisible();

    // Accepted → investor email disclosed (الدستور §I: only once accepted).
    await expect(page.getByText(/sara@example\.com/)).toBeVisible();

    // Rejected → rejection reason shown.
    await expect(page.getByText(/البيانات المالية غير مكتملة/)).toBeVisible();

    // Cancelled → the investor-cancelled note replaces accept/reject buttons.
    const cancelledCard = page.locator("article").filter({ hasText: /نورة القحطاني/ });
    await expect(
      cancelledCard.getByText(t(testInfo, "تم إلغاء هذا الطلب من قبل المستثمر", "This request was cancelled by the investor"))
    ).toBeVisible();
    await expect(cancelledCard.getByRole("button", { name: t(testInfo, "قبول", "Accept") })).toHaveCount(0);

    // Combinable filter: pending only.
    await page.getByRole("button", { name: t(testInfo, "معلق", "Pending") }).click();
    await expect(page.getByText(/أحمد السالم/)).toBeVisible();
    await expect(page.getByText(/سارة المطيري/)).not.toBeVisible();
  });

  test("shows the empty state when there are no requests", async ({ page, context }, testInfo) => {
    await mockReceivedBoard(page, { items: [] });
    await addAuthCookies(context, { role: "idea_owner", name: "صاحب المشروع" });
    await page.goto(appPath(testInfo, "/interests/received"));

    await expect(page.getByText(t(testInfo, "لا توجد طلبات اهتمام", "No interest requests"))).toBeVisible();
  });
});

test.describe("Sent interest board (investor)", () => {
  test("paginates 12 per page and cancels a request via confirmation", async ({ page, context }, testInfo) => {
    const items = Array.from({ length: 13 }, (_, idx) => makeSent(idx + 1));
    await mockSentBoard(page, {
      items,
      counters: { total: 13, pending: 13, accepted: 0, rejected: 0, cancelled: 0 },
    });
    await addAuthCookies(context, { role: "investor", name: "مستثمر تجريبي" });
    await page.goto(appPath(testInfo, "/interests/sent"));

    // Page 1: 12 cards, "مشروع 13" not yet visible.
    await expect(page.locator("article")).toHaveCount(12);
    await expect(page.getByRole("heading", { name: "مشروع 1", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "مشروع 13", exact: true })).not.toBeVisible();

    // Page 2: only "مشروع 13".
    await page.getByRole("button", { name: tExact(testInfo, "التالي", "Next") }).click();
    await expect(page.getByRole("heading", { name: "مشروع 13", exact: true })).toBeVisible();
    await expect(page.locator("article")).toHaveCount(1);

    // Cancel → confirmation dialog → toast.
    await page
      .locator("article")
      .filter({ hasText: /مشروع 13/ })
      .getByRole("button", { name: t(testInfo, "إلغاء الطلب", "Cancel request") })
      .click();
    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toBeVisible();
    await confirm
      .getByRole("button", { name: t(testInfo, "نعم، إلغاء", "Yes, cancel") })
      .click();
    await expect(confirm).toBeHidden();
    await expect(page.getByText(t(testInfo, "تم إلغاء الطلب", "Request cancelled"))).toBeVisible();
  });
});
