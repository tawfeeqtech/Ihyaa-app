// @ts-check
/**
 * EPIC-08 · Express interest (US-042 / T039)
 *
 * The gallery + detail page are server-rendered against the real seeded
 * backend (DemoProjectSeeder → published projects 1..12), so we read a real
 * project id from a gallery card and drive the investor interest flow:
 * open modal → submit without a type → inline validation → select + send →
 * the CTA transforms to "تم الإرسال" and is non-re-clickable. A second test
 * covers the network-error retry preserving the typed message.
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

/** Open the gallery, read the first card's real project id, then log in as an investor. */
async function openRealProject(page, context, testInfo) {
  await page.goto(appPath(testInfo, "/projects"));
  const firstCard = page.locator("article").first();
  await expect(firstCard).toBeVisible();
  const href = await firstCard
    .locator("a[href*='/projects/']")
    .first()
    .getAttribute("href");
  const projectId = href.split("/").filter(Boolean).pop();
  await addAuthCookies(context, { role: "investor", name: "مستثمر تجريبي" });
  return projectId;
}

test.describe("Express interest (investor)", () => {
  test("submitting without a type validates, then sends and locks the CTA", async ({ page, context }, testInfo) => {
    const projectId = await openRealProject(page, context, testInfo);

    await mockApi(page, "POST", `projects/${projectId}/interest`, async (route) => {
      await route.fulfill(
        jsonResponse(
          envelope(
            {
              id: 501,
              project: { id: Number(projectId), title: "مشروع تجريبي" },
              status: "pending",
              interest_type: "investment",
            },
            "created"
          ),
          201
        )
      );
    });

    await page.goto(appPath(testInfo, `/projects/${projectId}`));

    // The "أنا مهتم" CTA is investor-only (and not the owner).
    const cta = page.getByRole("button", { name: t(testInfo, "أنا مهتم", "I am interested") });
    await expect(cta).toBeVisible();

    // Open the modal and try to send without picking a type.
    await cta.click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await dialog
      .getByRole("button", { name: t(testInfo, "إرسال الاهتمام", "Send interest") })
      .click();
    await expect(dialog.getByRole("alert")).toContainText(
      t(testInfo, "يرجى اختيار نوع الاهتمام", "Please select an interest type")
    );

    // Pick a type, write a message, send.
    await dialog.getByRole("radio", { name: t(testInfo, "استثمار", "Investment") }).check();
    const messageInput = dialog.getByLabel(t(testInfo, "رسالتك", "Your message"));
    await messageInput.fill("أرغب في معرفة المزيد عن مشروعك");
    await dialog
      .getByRole("button", { name: t(testInfo, "إرسال الاهتمام", "Send interest") })
      .click();

    // Success: the modal closes and the CTA transforms + locks.
    await expect(dialog).toBeHidden();
    const lockedCta = page.getByRole("button", { name: t(testInfo, "تم الإرسال", "Sent") });
    await expect(lockedCta).toBeVisible();
    await expect(lockedCta).toBeDisabled();
  });

  test("the 500-char counter blocks excess input", async ({ page, context }, testInfo) => {
    const projectId = await openRealProject(page, context, testInfo);
    await page.goto(appPath(testInfo, `/projects/${projectId}`));

    const cta = page.getByRole("button", { name: t(testInfo, "أنا مهتم", "I am interested") });
    await expect(cta).toBeVisible();
    await cta.click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    const messageInput = dialog.getByLabel(t(testInfo, "رسالتك", "Your message"));
    await messageInput.fill("أ".repeat(600));
    await expect(messageInput).toHaveValue("أ".repeat(500));
  });

  test("network failure offers a retry that preserves the typed message", async ({ page, context }, testInfo) => {
    const projectId = await openRealProject(page, context, testInfo);

    let attempts = 0;
    await page.route(`**/api/projects/${projectId}/interest`, async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      attempts += 1;
      if (attempts === 1) {
        // 503 with no message → the client falls back to its localized network error.
        await route.fulfill(jsonResponse({ success: false, data: null }, 503));
      } else {
        await route.fulfill(
          jsonResponse(
            envelope(
              {
                id: 502,
                project: { id: Number(projectId), title: "مشروع تجريبي" },
                status: "pending",
              },
              "created"
            ),
            201
          )
        );
      }
    });

    await page.goto(appPath(testInfo, `/projects/${projectId}`));
    const cta = page.getByRole("button", { name: t(testInfo, "أنا مهتم", "I am interested") });
    await expect(cta).toBeVisible();
    await cta.click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("radio", { name: t(testInfo, "استثمار", "Investment") }).check();
    const message = "أرغب في تمويل هذا المشروع";
    await dialog.getByLabel(t(testInfo, "رسالتك", "Your message")).fill(message);
    await dialog
      .getByRole("button", { name: t(testInfo, "إرسال الاهتمام", "Send interest") })
      .click();

    // The network error + retry appear and the typed message is preserved.
    await expect(dialog.getByRole("alert")).toContainText(
      t(testInfo, "تعذّر الإرسال", "Could not send")
    );
    await expect(dialog.getByLabel(t(testInfo, "رسالتك", "Your message"))).toHaveValue(message);

    // Retry succeeds → the modal closes and the CTA locks.
    await dialog
      .getByRole("button", { name: t(testInfo, "إعادة المحاولة", "Try again") })
      .click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: t(testInfo, "تم الإرسال", "Sent") })).toBeDisabled();
  });
});
