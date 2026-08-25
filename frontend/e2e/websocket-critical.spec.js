// @ts-check
/**
 * EPIC-09 · WebSocket critical broadcast (US-048 · T075)
 *
 * Real end-to-end over Reverb: the investor (Browser B) expresses interest on
 * a real demo project; the idea owner (Browser A) is subscribed to their
 * private notifications channel and the bell badge must update immediately.
 *
 * Reverb is NOT part of the playwright webServer list — the test skips
 * gracefully when it is unreachable. To run it locally, start the Reverb
 * server first (`php artisan reverb:start`) with the backend already serving.
 *
 * Latency (US-048 · ≤ 5s): measured from the moment the investor's interest
 * POST completes. The notification row is created AND broadcast synchronously
 * inside that same request (NotificationService::notify → broadcast()), so
 * POST-completion is a faithful proxy for the DB created_at timestamp. The
 * owner's bell badge must show baseline+1 within the 5s window.
 *
 * Auth is real (Sanctum Bearer tokens):
 *   - idea owner: seeded demo-owner@ihyaa.test (login → token)
 *   - investor:  fresh register → dev_otp (APP_DEBUG=true only) → verify → token
 */
const { test, expect } = require("@playwright/test");
const { addAuthCookies, appPath, t } = require("./helpers");

const API = "http://localhost:8000/api";
const REVERB_PROBE = "http://127.0.0.1:8090";
const OWNER_EMAIL = "demo-owner@ihyaa.test";
const OWNER_PASSWORD = "password";
const LATENCY_CEILING_MS = 5000;

/** Any HTTP response on the Reverb port means the server is up. */
async function reverbReachable() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(REVERB_PROBE, { method: "GET", signal: controller.signal });
    clearTimeout(timer);
    return res.status !== 0;
  } catch {
    return false;
  }
}

/** POST a JSON body to the real backend and parse the Laravel envelope. */
async function apiPost(path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

test("critical interest_new reaches the idea owner's bell within 5s", async ({ browser }, testInfo) => {
  test.skip(
    !(await reverbReachable()),
    "Reverb is not running — start it with `php artisan reverb:start` to run the WebSocket E2E"
  );

  // ── Idea owner (Browser A): real login with the seeded demo owner ─────────
  const ownerLogin = await apiPost("/login", { email: OWNER_EMAIL, password: OWNER_PASSWORD });
  expect(ownerLogin.status).toBe(200);
  const ownerToken = ownerLogin.body.data.token;

  // Baseline unread count (the DB may hold leftovers from previous runs).
  const ownerCountRes = await fetch(`${API}/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${ownerToken}`, Accept: "application/json" },
  });
  const baseline = (await ownerCountRes.json())?.data?.unread_count ?? 0;
  const expectedBadge = baseline + 1;

  const ownerContext = await browser.newContext();
  await addAuthCookies(ownerContext, { role: "idea_owner", name: "Demo Idea Owner", token: ownerToken });
  const ownerPage = await ownerContext.newPage();
  await ownerPage.goto(appPath(testInfo, "/notifications"));

  // The bell must render and reflect the baseline count.
  const bell = ownerPage.getByLabel(
    t(testInfo, `الإشعارات، ${baseline} غير مقروء`, `Notifications, ${baseline} unread`)
  );
  await expect(bell).toBeVisible();

  // ── Investor (Browser B): real register → dev_otp → verify → real token ───
  const email = `investor-${Date.now()}@e2e.test`;
  const reg = await apiPost("/register", {
    name: "E2E Investor",
    email,
    password: "Password123!",
    role: "investor",
  });
  const devOtp = reg.body?.data?.dev_otp;
  test.skip(
    !devOtp,
    "register did not return dev_otp (APP_DEBUG=false?) — cannot complete OTP verification; skipping"
  );

  const verify = await apiPost("/email/verify", { email, code: devOtp });
  expect(verify.status).toBe(200);
  const investorToken = verify.body.data.token;

  const investorContext = await browser.newContext();
  await addAuthCookies(investorContext, { role: "investor", name: "E2E Investor", token: investorToken });
  const investorPage = await investorContext.newPage();

  // Open a real demo project (owned by demo-owner) and send interest.
  await investorPage.goto(appPath(testInfo, "/projects"));
  const firstCard = investorPage.locator("article").first();
  await expect(firstCard).toBeVisible();
  const href = await firstCard.locator("a[href*='/projects/']").first().getAttribute("href");
  const projectId = href.split("/").filter(Boolean).pop();
  await investorPage.goto(appPath(testInfo, `/projects/${projectId}`));

  const cta = investorPage.getByRole("button", { name: t(testInfo, "أنا مهتم", "I am interested") });
  await expect(cta).toBeVisible();
  await cta.click();
  const dialog = investorPage.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("radio", { name: t(testInfo, "استثمار", "Investment") }).check();
  await dialog.getByRole("button", { name: t(testInfo, "إرسال الاهتمام", "Send interest") }).click();
  await expect(dialog).toBeHidden();

  // The notification row + broadcast complete inside the interest POST, so the
  // window starts once the dialog closes (POST has returned).
  const t0 = Date.now();

  // T075 — the owner's bell badge must reflect baseline+1 within 5s.
  await expect(
    ownerPage.getByLabel(t(testInfo, `الإشعارات، ${expectedBadge} غير مقروء`, `Notifications, ${expectedBadge} unread`))
  ).toBeVisible({ timeout: LATENCY_CEILING_MS });

  const elapsed = Date.now() - t0;
  expect(elapsed).toBeLessThanOrEqual(LATENCY_CEILING_MS);
});
