// @ts-check
/**
 * EPIC-09 · Notifications (US-047/049 · T068/T071/T078/T081/T082)
 *
 * The bell + notifications page are client components, so their API calls are
 * mocked for deterministic tests. T081 is driven from the investor's side:
 * after the idea owner accepts/rejects a request, the investor reloads and
 * sees (a) the resulting notification on the notifications page, (b) the
 * updated status of the sent request, and (c) the rejection reason (or, on
 * acceptance, the disclosed idea-owner email — الدستور §I).
 *
 * Also covered: the bell badge reflects unread-count and read-all clears it
 * (T068), and every row renders a local relative-time <time> element (T082).
 */
const { test, expect } = require("@playwright/test");
const {
  appPath,
  t,
  envelope,
  jsonResponse,
  addAuthCookies,
  mockApi,
} = require("./helpers");

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

/**
 * Mock every notification endpoint the bell + page use.
 * - GET /notifications?page&per_page → paginated + meta.unread_count
 * - GET /notifications/recent        → last 5 (top-level data array)
 * - GET /notifications/unread-count  → { unread_count }
 * - PUT /notifications/{id}/read     → { id, read_at }
 * - PUT /notifications/read-all      → { marked }
 * - GET /me                          → current user (Echo boot resolves /me)
 */
async function mockNotifications(page, { notifications = [], unreadCount = 0 } = {}) {
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
        meta: {
          current_page: 1,
          per_page: perPage,
          total,
          last_page: lastPage,
          unread_count: unreadCount,
        },
      })
    );
  });

  await mockApi(page, "GET", "notifications/recent", async (route) => {
    await route.fulfill(jsonResponse(envelope(notifications.slice(0, 5))));
  });

  await mockApi(page, "GET", "notifications/unread-count", async (route) => {
    await route.fulfill(jsonResponse(envelope({ unread_count: unreadCount })));
  });

  await mockApi(page, "PUT", "notifications/*/read", async (route) => {
    const segments = route.request().url().split("/");
    const id = Number(segments[segments.length - 2]);
    await route.fulfill(jsonResponse(envelope({ id, read_at: "2026-08-15T09:00:00Z" })));
  });

  await mockApi(page, "PUT", "notifications/read-all", async (route) => {
    await route.fulfill(jsonResponse(envelope({ marked: notifications.length })));
  });

  await mockApi(page, "GET", "me", async (route) => {
    await route.fulfill(jsonResponse(envelope({ id: 1, name: "مستثمر تجريبي", role: "investor" })));
  });
}

/** Mock GET /api/interests/sent with the given row + counters. */
async function mockSentBoard(page, { items = [] }) {
  const counters = { total: items.length, pending: 0, accepted: 0, rejected: 0, cancelled: 0 };
  for (const it of items) counters[it.status] = (counters[it.status] ?? 0) + 1;

  await mockApi(page, "GET", "interests/sent", async (route) => {
    await route.fulfill(
      jsonResponse({
        success: true,
        message: "ok",
        data: items,
        meta: { current_page: 1, per_page: 12, total: items.length, last_page: 1 },
        counters,
      })
    );
  });
}

test.describe("Notifications page + bell (investor)", () => {
  test("rejection flow: notification appears + sent status updated + rejection reason", async ({ page, context }, testInfo) => {
    const notification = makeNotification(11, {
      type: "interest_rejected",
      title: "تم رفض اهتمامك بمشروع منصة ذكية",
      body: "البيانات المالية غير مكتملة",
      is_critical: false,
      url: "/interests/sent",
      data: { url: "/interests/sent" },
    });
    const sent = {
      id: 501,
      project: { id: 3, title: "منصة ذكية", ai_score: 72 },
      interest_type: "investment",
      message: "أرغب في تمويل هذا المشروع",
      status: "rejected",
      rejection_reason: "البيانات المالية غير مكتملة",
      created_at: "2026-08-10T08:00:00Z",
      emails: {},
      can_cancel: false,
    };

    await mockNotifications(page, { notifications: [notification], unreadCount: 1 });
    await mockSentBoard(page, { items: [sent] });

    await addAuthCookies(context, { role: "investor", name: "مستثمر تجريبي" });
    await page.goto(appPath(testInfo, "/notifications"));

    // T081 — the rejection notification appears on the notifications page.
    await expect(page.getByRole("heading", { name: t(testInfo, "الإشعارات", "Notifications") })).toBeVisible();
    await expect(page.getByText("تم رفض اهتمامك بمشروع منصة ذكية")).toBeVisible();
    await expect(page.getByText("البيانات المالية غير مكتملة")).toBeVisible();
    await expect(page.getByText(t(testInfo, "تم رفض الاهتمام", "Interest rejected"))).toBeVisible();

    // T082 — a local relative-time <time> is rendered.
    await expect(page.locator("time[datetime]").first()).toBeVisible();

    // T068 — the bell badge reflects the unread count.
    await expect(page.getByLabel(t(testInfo, "الإشعارات، 1 غير مقروء", "Notifications, 1 unread"))).toBeVisible();

    // T081 — the sent board shows the rejected status + rejection reason.
    await page.goto(appPath(testInfo, "/interests/sent"));
    const rejectedCard = page.locator("article").filter({ hasText: "منصة ذكية" });
    await expect(rejectedCard.getByRole("heading", { name: "منصة ذكية" })).toBeVisible();
    await expect(rejectedCard.getByText(t(testInfo, "مرفوض", "Rejected"))).toBeVisible();
    await expect(rejectedCard.getByText(/البيانات المالية غير مكتملة/)).toBeVisible();
  });

  test("acceptance flow: notification + accepted status + idea-owner email disclosed", async ({ page, context }, testInfo) => {
    const notification = makeNotification(12, {
      type: "interest_accepted",
      title: "تم قبول اهتمامك بمشروع منصة ذكية",
      body: "",
      is_critical: false,
      url: "/interests/sent",
      data: { url: "/interests/sent" },
    });
    const sent = {
      id: 502,
      project: { id: 3, title: "منصة ذكية", ai_score: 72 },
      interest_type: "investment",
      message: "أرغب في تمويل هذا المشروع",
      status: "accepted",
      rejection_reason: null,
      created_at: "2026-08-10T08:00:00Z",
      emails: { idea_owner_email: "demo-owner@ihyaa.test" },
      can_cancel: true,
    };

    await mockNotifications(page, { notifications: [notification], unreadCount: 1 });
    await mockSentBoard(page, { items: [sent] });

    await addAuthCookies(context, { role: "investor", name: "مستثمر تجريبي" });
    await page.goto(appPath(testInfo, "/notifications"));
    await expect(page.getByText("تم قبول اهتمامك بمشروع منصة ذكية")).toBeVisible();

    await page.goto(appPath(testInfo, "/interests/sent"));
    const acceptedCard = page.locator("article").filter({ hasText: "منصة ذكية" });
    await expect(acceptedCard.getByRole("heading", { name: "منصة ذكية" })).toBeVisible();
    await expect(acceptedCard.getByText(t(testInfo, "مقبول", "Accepted"))).toBeVisible();
    // الدستور §I — the idea-owner email is disclosed only after acceptance.
    await expect(acceptedCard.getByText(/demo-owner@ihyaa\.test/)).toBeVisible();
  });

  test("bell badge shows the unread count and mark-all-read clears it", async ({ page, context }, testInfo) => {
    const items = [
      makeNotification(1, {
        type: "interest_new",
        title: "طلب اهتمام جديد: منصة ذكية",
        is_critical: true,
        url: "/interests/received",
        data: { url: "/interests/received" },
      }),
      makeNotification(2, {
        type: "evaluation_completed",
        title: "اكتمل تقييم مشروعك",
        is_critical: true,
        url: "/projects/3",
        data: { url: "/projects/3" },
      }),
      makeNotification(3, {
        type: "interest_rejected",
        title: "تم رفض اهتمامك بمشروع منصة ذكية",
        is_critical: false,
      }),
    ];

    await mockNotifications(page, { notifications: items, unreadCount: 3 });

    await addAuthCookies(context, { role: "investor", name: "مستثمر تجريبي" });
    await page.goto(appPath(testInfo, "/notifications"));

    // Badge shows 3 unread.
    await expect(page.getByLabel(t(testInfo, "الإشعارات، 3 غير مقروء", "Notifications, 3 unread"))).toBeVisible();

    // Open the bell → the last-5 list renders with a relative-time row.
    // Scope the row assertions to the dropdown list: the same notification
    // titles also render in the full page list behind it, so an unscoped
    // `getByText` would match 2 elements (strict-mode violation).
    await page.getByLabel(t(testInfo, "الإشعارات، 3 غير مقروء", "Notifications, 3 unread")).click();
    const dropdown = page.getByRole("list", { name: t(testInfo, "أحدث الإشعارات", "Recent notifications") });
    await expect(dropdown).toBeVisible();
    await expect(dropdown.getByText("طلب اهتمام جديد: منصة ذكية")).toBeVisible();
    await expect(dropdown.locator("time[datetime]").first()).toBeVisible();

    // Close the dropdown, then use the page-level "mark all read". Wait for the
    // exit animation to unmount it first — its footer carries a "mark all read"
    // button with the same Arabic label (dropdown.markAllRead = page.markAllRead),
    // so two matching buttons would exist mid-exit.
    await page.keyboard.press("Escape");
    await expect(dropdown).toHaveCount(0);
    await page.getByRole("button", { name: t(testInfo, "تحديد الكل كمقروء", "Mark all as read") }).click();
    await expect(page.getByText(t(testInfo, "تم تحديد جميع الإشعارات كمقروءة", "All notifications marked as read"))).toBeVisible();
    await expect(page.getByLabel(t(testInfo, "الإشعارات، 0 غير مقروء", "Notifications, 0 unread"))).toBeVisible();
    await expect(page.getByRole("button", { name: t(testInfo, "تحديد الكل كمقروء", "Mark all as read") })).toHaveCount(0);
  });
});
