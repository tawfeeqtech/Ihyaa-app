// @ts-check
/**
 * SC-012 · Idea owner flow (SRS-TEST-13 subset)
 * Scenario 2 — create project ← upload cover ← appears in the gallery.
 *
 * Register (idea owner) → OTP → dashboard → 4-step project wizard → publish →
 * the new project is the first card in the public gallery.
 */
const { test, expect } = require("@playwright/test");
const {
  appPath,
  lang,
  t,
  tExact,
  makeApiProject,
  makeDemoProjects,
  mockRegister,
  mockVerifyOtp,
  mockOwnerDashboard,
  mockCategories,
  mockTagSuggestions,
  mockProjectCreate,
  mockProjectsList,
  fillOtp,
} = require("./helpers");

/** aria-label of the first team-member name input: "الاسم 1" / "Name 1". */
function memberNameLabel(testInfo) {
  return new RegExp(lang(testInfo) === "ar" ? "^الاسم 1$" : "^Name 1$");
}

// A 1×1 transparent PNG used as the cover upload (the upload endpoint is mocked).
const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

const TITLE = "منصة تمويل ذكية";
const SHORT_DESC = "منصة ذكية تربط أصحاب الأفكار بالمستثمرين عبر تقييم آلي في خمسة أبعاد.";
const DETAILS = "منصة متكاملة للتقييم الذكي والمطابقة بين المشاريع والمستثمرين في المنطقة العربية.";
const NEW_PROJECT_ID = 101;

test.describe("Idea owner flow", () => {
  test("owner registers, creates a project with a cover and sees it in the gallery", async ({ page }, testInfo) => {
    // ---- Auth: register → OTP → owner dashboard (mocked API). ----
    await mockRegister(page, { name: "خالد العتيبي", role: "idea_owner" });
    await mockVerifyOtp(page, { name: "خالد العتيبي", role: "idea_owner" });
    await mockOwnerDashboard(page);

    await page.goto(appPath(testInfo, "/register"));
    await page.locator("#name").fill("خالد العتيبي");
    await page.locator("#email").fill("khalid@example.com");
    await page.locator("#password").fill("Pass123456!");
    await page.getByLabel(t(testInfo, "أوافق على", "I agree to the")).check();
    await page.getByRole("button", { name: t(testInfo, "إنشاء الحساب", "Create account") }).click();

    await expect(page).toHaveURL(/\/verify-otp\?email=/);
    await fillOtp(page, testInfo, "123456");
    await expect(page).toHaveURL(/\/dashboard\/owner/);
    await expect(
      page.getByRole("heading", { name: t(testInfo, "لوحة صاحب الفكرة", "Idea owner dashboard") })
    ).toBeVisible();

    // ---- Project wizard: mock categories, tags + the create endpoint. ----
    await mockCategories(page);
    await mockTagSuggestions(page);
    await mockProjectCreate(page, { id: NEW_PROJECT_ID });
    // The gallery must show the newly created project as the first card.
    await mockProjectsList(page, {
      projects: [
        makeApiProject(NEW_PROJECT_ID, { title: TITLE, description: SHORT_DESC }),
        ...makeDemoProjects(11),
      ],
    });

    await page.goto(appPath(testInfo, "/projects/new"));

    // Step 1 — basics.
    await page.locator("#w-title").fill(TITLE);
    await page.locator("#w-desc").fill(SHORT_DESC);
    await page.locator("#w-sector").selectOption("1");
    await page.getByPlaceholder(t(testInfo, "اكتب تقنية واضغط Enter لإضافتها", "Type a technology and press Enter to add it")).fill("React");
    await page.keyboard.press("Enter");
    // Attach a cover image (sr-only input — setInputFiles works on hidden inputs).
    await page.locator("#w-cover").setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: PNG_BYTES });
    await page.getByRole("button", { name: tExact(testInfo, "التالي", "Next") }).click();

    // Step 2 — details & links.
    await page.locator("#w-details").fill(DETAILS);
    await page.locator("#w-repo").fill("https://github.com/example/smart-funding");
    await page.locator("#w-video").fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await page.getByRole("button", { name: tExact(testInfo, "التالي", "Next") }).click();

    // Step 3 — team & budget.
    await page.getByLabel(memberNameLabel(testInfo)).fill("خالد العتيبي");
    await page.getByLabel(t(testInfo, "الدور", "Role")).fill("مؤسس تقني");
    await page.locator("#w-budget-min").fill("50000");
    await page.locator("#w-budget-max").fill("150000");
    await page.getByRole("button", { name: tExact(testInfo, "التالي", "Next") }).click();

    // Step 4 — visibility + rights → publish.
    await page.getByLabel(t(testInfo, "أُقر بأنني أملك", "I confirm I own")).check();
    await page.getByRole("button", { name: t(testInfo, "نشر المشروع", "Publish project") }).click();

    // Success screen.
    await expect(
      page.getByRole("heading", { name: t(testInfo, "تم نشر مشروعك بنجاح", "Your project was published successfully") })
    ).toBeVisible();

    // ---- The new project appears in the public gallery. ----
    await page.getByRole("link", { name: t(testInfo, "استعراض المعرض", "View gallery") }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();
  });
});
