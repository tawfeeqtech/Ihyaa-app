// @ts-check
/**
 * SC-012 · Register & login (SRS-TEST-13 subset)
 * Scenario 1 — register user (idea owner) ← OTP ← login.
 *
 * Registration does NOT issue a token (Constitution V · T124); the token is
 * issued by /email/verify. OTP email cannot be received in E2E, so the OTP
 * API is mocked. Auth cookies are mirrored by the browser on success.
 */
const { test, expect } = require("@playwright/test");
const {
  appPath,
  t,
  envelope,
  jsonResponse,
  mockRegister,
  mockVerifyOtp,
  mockLogin,
  mockOwnerDashboard,
  fillOtp,
} = require("./helpers");

const PASSWORD = "Pass123456!";
const NAME = "خالد العتيبي";
const EMAIL = "khalid@example.com";

test.describe("Register & login", () => {
  test("idea owner registers, verifies OTP and lands on the owner dashboard", async ({ page }, testInfo) => {
    await mockRegister(page, { name: NAME, role: "idea_owner" });
    await mockVerifyOtp(page, { name: NAME, role: "idea_owner" });
    await mockOwnerDashboard(page);

    await page.goto(appPath(testInfo, "/register"));

    // Role tabs: idea_owner is the default — no need to click.
    await page.locator("#name").fill(NAME);
    await page.locator("#email").fill(EMAIL);
    await page.locator("#password").fill(PASSWORD);
    await page.getByLabel(t(testInfo, "أوافق على", "I agree to the")).check();
    await page.getByRole("button", { name: t(testInfo, "إنشاء الحساب", "Create account") }).click();

    // → OTP screen with the email prefilled in the URL.
    await expect(page).toHaveURL(/\/verify-otp\?email=/);
    await expect(page.getByRole("heading", { name: t(testInfo, "تحقق من رمز OTP", "Verify your OTP") })).toBeVisible();

    // Enter a (mocked) valid code → auto-login → owner dashboard.
    await fillOtp(page, testInfo, "123456");
    await expect(page).toHaveURL(/\/dashboard\/owner/);
    await expect(
      page.getByRole("heading", { name: t(testInfo, "لوحة صاحب الفكرة", "Idea owner dashboard") })
    ).toBeVisible();
  });

  test("user registers as investor via the role tab", async ({ page }, testInfo) => {
    await mockRegister(page, { name: "سارة المستثمرة", role: "investor" });
    await mockVerifyOtp(page, { name: "سارة المستثمرة", role: "investor" });

    await page.goto(appPath(testInfo, "/register"));

    await page.getByRole("radio", { name: t(testInfo, "مستثمر", "Investor") }).click();
    await page.locator("#name").fill("سارة المستثمرة");
    await page.locator("#email").fill("sara@investor.test");
    await page.locator("#password").fill(PASSWORD);
    await page.getByLabel(t(testInfo, "أوافق على", "I agree to the")).check();
    await page.getByRole("button", { name: t(testInfo, "إنشاء الحساب", "Create account") }).click();

    await expect(page).toHaveURL(/\/verify-otp\?email=/);
  });

  test("user can sign in with valid credentials", async ({ page }, testInfo) => {
    await mockLogin(page, { name: NAME, role: "idea_owner" });
    await mockOwnerDashboard(page);

    await page.goto(appPath(testInfo, "/login"));
    await page.locator("#email").fill(EMAIL);
    await page.locator("#password").fill(PASSWORD);
    await page.getByRole("button", { name: t(testInfo, "تسجيل الدخول", "Sign in") }).click();

    await expect(page).toHaveURL(/\/dashboard\/owner/);
    await expect(
      page.getByRole("heading", { name: t(testInfo, "لوحة صاحب الفكرة", "Idea owner dashboard") })
    ).toBeVisible();
  });

  test("sign in with a wrong password shows an inline error", async ({ page }, testInfo) => {
    // 401 — invalid credentials.
    await page.route("**/api/login", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill(
        jsonResponse(
          envelope({ message: "Invalid credentials" }, "error"),
          401
        )
      );
    });

    await page.goto(appPath(testInfo, "/login"));
    await page.locator("#email").fill(EMAIL);
    await page.locator("#password").fill("WrongPass123!");
    await page.getByRole("button", { name: t(testInfo, "تسجيل الدخول", "Sign in") }).click();

    // The page renders a <p role="alert"> with the error.
    await expect(page.getByRole("alert")).toBeVisible();
    // And stays on the login page.
    await expect(page).toHaveURL(/\/login/);
  });

  test("sign in with an unverified email is sent to the OTP page", async ({ page }, testInfo) => {
    await page.route("**/api/login", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill(
        jsonResponse(
          envelope({ code: "EMAIL_NOT_VERIFIED", message: "Email not verified" }, "error"),
          422
        )
      );
    });

    await page.goto(appPath(testInfo, "/login"));
    await page.locator("#email").fill("unverified@example.com");
    await page.locator("#password").fill(PASSWORD);
    await page.getByRole("button", { name: t(testInfo, "تسجيل الدخول", "Sign in") }).click();

    await expect(page).toHaveURL(/\/verify-otp\?email=/);
  });
});
