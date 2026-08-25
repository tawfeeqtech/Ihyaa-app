// @ts-check
/**
 * EPIC-10 · Events page (US-053/2 · T064/T065)
 *
 * EventsList is a client widget → its GET /api/notifications fetch is mocked
 * (the deterministic pattern from notifications.spec.js). It renders normalized
 * rows (type chip + local relative time) and, with no rows, the empty state.
 *
 * Realtime (T065) degrades gracefully: /me is mocked with an empty payload so
 * getRealtime() resolves to null (no Reverb connection is attempted) and the
 * list shows the paginated page untouched.
 */
const { test, expect } = require("@playwright/test");
const { appPath, t, tExact, envelope, jsonResponse, addAuthCookies, mockApi } = require("../helpers");

/** One notification row (the shape mapApiNotification consumes). */
function makeNotification(i, overrides = {}) {
  return {
    id: i,
    type: "generic",
    title: "إشعار تجريبي",
    body: "",
    data: {},
    is_critical: false,
    read_at: null,
    created_at: "2026-08-10T08:00:00Z",
    created_at_relative: "قبل 3 أيام",
    url: null,
    ...overrides,
  };
}

/** Mock the events page's client fetches: the paginated list + the /me probe. */
async function mockEventsApi(page, { notifications = [] } = {}) {
  await mockApi(page, "GET", "notifications", async (route) => {
    const url = new URL(route.request().url());
    const perPage = Number(url.searchParams.get("per_page") ?? 20);
    const total = notifications.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    await route.fulfill(
      jsonResponse({
        success: true,
        message: "ok",
        data: notifications,
        meta: { current_page: 1, per_page: perPage, total, last_page: lastPage },
      })
    );
  });
  // Empty payload → getRealtime() returns null without opening a WebSocket.
  await mockApi(page, "GET", "me", async (route) => {
    await route.fulfill(jsonResponse(envelope({})));
  });
}

test.describe("Events page (US-053/2)", () => {
  test("renders notification rows with type chip and relative time (T064)", async ({ page, context }, testInfo) => {
    const rows = [
      makeNotification(1, {
        type: "interest_received",
        title: "طلب اهتمام جديد: منصة ذكية",
        body: "أرغب في الاستثمار",
        is_critical: true,
      }),
      makeNotification(2, { type: "evaluation_completed", title: "اكتمل تقييم مشروعك" }),
    ];
    await mockEventsApi(page, { notifications: rows });
    await addAuthCookies(context, { role: "idea_owner", name: "خالد العتيبي" });
    await page.goto(appPath(testInfo, "/events"));

    await expect(page.getByRole("heading", { name: t(testInfo, "الأحداث", "Events") })).toBeVisible();

    // Exact matches: the row title/body spans — the wrapping row link carries
    // more text, so an exact match keeps the locator unambiguous.
    await expect(page.getByText("طلب اهتمام جديد: منصة ذكية", { exact: true })).toBeVisible();
    await expect(page.getByText("أرغب في الاستثمار", { exact: true })).toBeVisible();

    // The type chip is anchored (the title above contains «اهتمام جديد» as a
    // substring — tExact scopes the match to the chip only).
    await expect(page.getByText(tExact(testInfo, "اهتمام جديد", "New interest"))).toBeVisible();

    // T082 — a local relative-time <time> element.
    await expect(page.locator("time[datetime]").first()).toBeVisible();
  });

  test("shows the empty state when there are no events", async ({ page, context }, testInfo) => {
    await mockEventsApi(page, { notifications: [] });
    await addAuthCookies(context, { role: "idea_owner", name: "خالد العتيبي" });
    await page.goto(appPath(testInfo, "/events"));

    await expect(page.getByText(t(testInfo, "لا توجد أحداث بعد", "No events yet"))).toBeVisible();
  });
});
