// @ts-check
// Playwright E2E config — Ihyaa frontend
// Constitution VII / SC-012 — E2E via Playwright. RTL (ar) + LTR (en) projects.
// Run: npm run test:e2e   (npx playwright test)
const { defineConfig, devices } = require("@playwright/test");

// Frontend dev server + Laravel API backend. Both are auto-started when they are
// not already running (reuseExistingServer keeps an already-running server).
const FE_PORT = 3000;
const API_PORT = 8000;
const API_URL = `http://localhost:${API_PORT}`;

module.exports = defineConfig({
  testDir: "./e2e",
  // Playwright 1.49+ glob: all *.spec.js directly under e2e/
  testMatch: "**/*.spec.js",
  // Keep CI fast: a single failed test run should not cascade across projects.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],

  // The frontend URL (locale prefix added by the app: /ar/..., /en/...).
  use: {
    baseURL: `http://localhost:${FE_PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Backend API is reachable from the browser for the mocked flows.
    // The Next.js server component (/projects/[id]) fetches the API server-side,
    // so those tests hit the real running backend instead of page.route.
  },

  // Auto-start both servers. Tests skip waiting when a server is already up.
  webServer: [
    {
      command: "npm run dev",
      cwd: __dirname,
      url: `http://localhost:${FE_PORT}/ar/login`,
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_API_URL: `${API_URL}/api`,
      },
    },
    {
      command: "php artisan serve --host=127.0.0.1 --port=8000",
      cwd: "../backend",
      url: `${API_URL}/api/health`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],

  projects: [
    {
      // Arabic-first — RTL. This is the default locale (localePrefix: 'always').
      name: "arabic-rtl",
      use: {
        ...devices["Desktop Chrome"],
        locale: "ar-SA",
        // Passed to tests via testInfo.project.use (used by helpers to build URLs).
        lang: "ar",
      },
    },
    {
      // English — LTR.
      name: "english-ltr",
      use: {
        ...devices["Desktop Chrome"],
        locale: "en-US",
        lang: "en",
      },
    },
  ],
});
