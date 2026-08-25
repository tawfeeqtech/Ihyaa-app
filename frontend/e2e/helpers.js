// @ts-check
/**
 * Shared helpers + API mocks for the Ihyaa E2E suite.
 *
 * The suite runs against the real Next.js app + Laravel backend that
 * `playwright.config.js` auto-starts. Browser-side fetches from client
 * components can be mocked with `page.route`; server-rendered pages
 * (e.g. /projects/[id]) hit the real backend — the DemoProjectSeeder provides
 * 12 published projects, so those pages have real data to render.
 *
 * The API client (`src/shared/lib/api.js`) unwraps the Laravel envelope
 * { success, message, data } — successful mocks must return that shape.
 * Paginated endpoints additionally carry a top-level `meta` object
 * ({ current_page, per_page, total, last_page }).
 */

const API = "http://localhost:8000/api";
const APP_ORIGIN = "http://localhost:3000";
const PAGE_SIZE = 12;

/** Active project language: "ar" (RTL) or "en" (LTR) — set in playwright.config.js. */
function lang(testInfo) {
  return testInfo.project.use.lang || "ar";
}

/** Build a locale-prefixed app path, e.g. "/ar/login". */
function appPath(testInfo, path) {
  const l = lang(testInfo);
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `/${l}${clean}`;
}

/** Regex that matches the text of the active locale. */
function t(testInfo, ar, en) {
  return new RegExp(lang(testInfo) === "ar" ? ar : en);
}

/**
 * Anchored regex matching EXACTLY the text of the active locale.
 * Playwright ignores `exact: true` when `name`/`hasText` is a RegExp, so
 * substring collisions (e.g. pagination "Next" vs "Open Next.js Dev Tools")
 * must be disambiguated with ^…$ anchors.
 */
function tExact(testInfo, ar, en) {
  return new RegExp(`^${lang(testInfo) === "ar" ? ar : en}$`);
}

/** Laravel envelope: { success, message, data }. */
function envelope(data, message = "ok") {
  return { success: true, message, data };
}

/**
 * Playwright `route.fulfill()` options for a JSON body in the Laravel envelope
 * shape. Must be a plain options object — a WHATWG `Response` instance is NOT
 * accepted by `route.fulfill` (it destructures `options.json`/`options.body`
 * from it and rejects with "Can specify either body or json parameters").
 */
function jsonResponse(body, status = 200) {
  return {
    status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

/** Empty Laravel pagination meta. */
function emptyMeta(perPage = 50) {
  return { current_page: 1, per_page: perPage, total: 0, last_page: 1 };
}

/**
 * Inject the auth cookies + localStorage the middleware / AuthProvider rely on.
 * Call before the first navigation so both server (cookies) and client
 * (localStorage) agree on the session.
 */
async function addAuthCookies(context, { role, name, token = "e2e-token-123" }) {
  await context.addInitScript(
    ({ role, name, token }) => {
      localStorage.setItem("ihyaa_user", JSON.stringify({ name, role }));
      localStorage.setItem("ihyaa_token", token);
    },
    { role, name, token }
  );
  await context.addCookies([
    { name: "ihyaa_token", value: token, url: APP_ORIGIN },
    { name: "ihyaa_role", value: role, url: APP_ORIGIN },
    { name: "ihyaa_name", value: name, url: APP_ORIGIN },
  ]);
}

/**
 * Register a page.route for an API endpoint, optionally gated by HTTP method.
 *
 * The pattern matches the URL PATHNAME only — the query string is ignored — so
 * a mock registered as `notifications` also intercepts
 * `/api/notifications?page=1&per_page=20`. (A Playwright glob written as
 * two stars then a slash before the path compiles to an anchored regex that
 * does NOT match query strings, so mocked requests silently fell through to the
 * real backend.) A single `*` in the pattern matches one path segment.
 */
function mockApi(page, method, pathPattern, handler) {
  const escaped = pathPattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*");
  const pathRe = new RegExp(`^/api/${escaped}$`);
  return page.route((url) => pathRe.test(url.pathname), async (route) => {
    if (method && route.request().method() !== method) return route.continue();
    await handler(route);
  });
}

// ---------------------------------------------------------------- Auth mocks

/** POST /api/register → { id, name, email, role }. */
async function mockRegister(page, opts = {}) {
  await mockApi(page, "POST", "register", async (route) => {
    const body = route.request().postDataJSON();
    await route.fulfill(
      jsonResponse(
        envelope(
          {
            id: 1,
            name: body?.name ?? opts.name ?? "مستخدم تجريبي",
            email: body?.email ?? "user@example.com",
            role: body?.role ?? opts.role ?? "idea_owner",
          },
          "registered"
        )
      )
    );
  });
}

/** POST /api/email/verify → { token, user } — auto-login after OTP. */
async function mockVerifyOtp(page, opts = {}) {
  const { role = "idea_owner", name = "مستخدم تجريبي", token = "e2e-token-123" } = opts;
  await mockApi(page, "POST", "email/verify", async (route) => {
    await route.fulfill(
      jsonResponse(
        envelope({
          token,
          user: {
            id: 1,
            name,
            email: "user@example.com",
            role,
            // Matches the real UserResource — a successfully verified account is
            // email_verified=true, which makes the client set ihyaa_verified=1
            // (الدستور V · src/middleware.js redirects /projects/new → OTP when 0).
            email_verified: true,
          },
        })
      )
    );
  });
}

/** POST /api/login → { token, user }. */
async function mockLogin(page, opts = {}) {
  const { role = "idea_owner", name = "مستخدم تجريبي", token = "e2e-token-123" } = opts;
  await mockApi(page, "POST", "login", async (route) => {
    await route.fulfill(
      jsonResponse(
        envelope({
          token,
          user: {
            id: 1,
            name,
            email: "user@example.com",
            role,
            // Matches the real UserResource. Pass { email_verified: false } in
            // opts to simulate an unverified login (the client then keeps
            // ihyaa_verified=0 and middleware enforces الدستور V).
            email_verified: true,
          },
        })
      )
    );
  });
}

/**
 * Fake OAuth flow — no real Google/GitHub/LinkedIn call is made.
 *  1. GET /api/auth/{provider}?redirect_to=… → { data: { redirect_url } }
 *     pointing back at the app callback with temp params.
 *  2. The callback page stores temp OAuth cookies and forwards to select-role.
 *  3. POST /api/auth/{provider}/role finalises the session (response ignored).
 */
async function mockOAuth(page, opts = {}) {
  const {
    provider = "google",
    name = "Investor Fake",
    role = "investor",
    token = "e2e-oauth-token",
  } = opts;

  await page.route((url) => url.pathname === `/api/auth/${provider}`, async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    const redirectTo = new URL(route.request().url()).searchParams.get("redirect_to");
    const cb = redirectTo || `${APP_ORIGIN}/ar/auth/callback`;
    await route.fulfill(
      jsonResponse(
        envelope({
          redirect_url: `${cb}?token=${token}&provider=${provider}&name=${encodeURIComponent(
            name
          )}&role_required=1&role_setup_state=state123`,
        })
      )
    );
  });

  await mockApi(page, "POST", `auth/${provider}/role`, async (route) => {
    await route.fulfill(jsonResponse(envelope({ ok: true })));
  });
}

// ------------------------------------------------------------- Project mocks

/** GET /api/categories → array of { id, slug, name_ar, name_en }. */
async function mockCategories(page) {
  await mockApi(page, "GET", "categories", async (route) => {
    await route.fulfill(
      jsonResponse(
        envelope([
          { id: 1, slug: "fintech", name_ar: "التقنية المالية", name_en: "Fintech" },
          { id: 2, slug: "ai", name_ar: "الذكاء الاصطناعي", name_en: "Artificial Intelligence" },
          { id: 3, slug: "edtech", name_ar: "التقنية التعليمية", name_en: "Edtech" },
        ])
      )
    );
  });
}

/** GET /api/tags/suggestions → { suggestions: [...] }. */
async function mockTagSuggestions(page) {
  await mockApi(page, "GET", "tags/suggestions", async (route) => {
    await route.fulfill(
      jsonResponse(envelope({ suggestions: ["React", "Next.js", "Python", "OpenAI"] }))
    );
  });
}

/** GET /api/search/suggestions → { suggestions: [...] }. */
async function mockSearchSuggestions(page) {
  await mockApi(page, "GET", "search/suggestions", async (route) => {
    await route.fulfill(jsonResponse(envelope({ suggestions: [] })));
  });
}

/** POST /api/projects → { id, ... } + accept the optional cover upload. */
async function mockProjectCreate(page, { id = 101 } = {}) {
  await mockApi(page, "POST", "projects", async (route) => {
    const body = route.request().postDataJSON();
    await route.fulfill(
      jsonResponse(
        envelope(
          {
            id,
            title: body?.title ?? "مشروع تجريبي",
            state: "needs_funding",
            publication_status: body?.publication_status ?? "published",
          },
          "created"
        )
      )
    );
  });

  // Cover image upload (optional) — accept it.
  await page.route(`**/api/projects/${id}/files`, async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await route.fulfill(jsonResponse(envelope({ uploaded: [] })));
  });
}

/**
 * A project in the backend `toCardArray` shape — the shape `mapApiProject`
 * (src/features/projects/data/projects.js) consumes.
 */
function makeApiProject(i, overrides = {}) {
  const num = String(i).padStart(2, "0");
  return {
    id: i,
    title: `Demo Project ${num}`,
    description: `وصف المشروع التجريبي رقم ${i} — نموذج بيانات لبطاقة مشروع في المعرض العام.`,
    category: { id: 1, slug: "fintech", name_ar: "التقنية المالية", name_en: "Fintech" },
    tags: ["React", "Next.js"],
    ai_score: 50 + (i % 40),
    state: "needs_funding",
    publication_status: "published",
    view_count: 10 * i,
    interested: i,
    created_at: new Date(Date.UTC(2026, 0, i)).toISOString(),
    owner: { id: 1, name: "Demo Owner", email: "demo-owner@ihyaa.test" },
    ...overrides,
  };
}

function makeDemoProjects(count = 24) {
  return Array.from({ length: count }, (_, idx) => makeApiProject(idx + 1));
}

/**
 * Mock GET /api/projects — the gallery's client-side fetch. Pagination- and
 * search-aware so the gallery's sort/search/paging behaviour can be tested
 * deterministically (the real backend data is covered by the integration test
 * in project-browsing.spec.js).
 */
async function mockProjectsList(page, { projects, perPage = PAGE_SIZE } = {}) {
  const all = projects ?? makeDemoProjects();
  await page.route((url) => url.pathname === "/api/projects", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    const url = new URL(route.request().url());
    const pageNo = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const size = Math.max(1, Number(url.searchParams.get("per_page") ?? perPage));
    const q = (url.searchParams.get("q") ?? "").toLowerCase();

    let filtered = all;
    if (q) {
      filtered = filtered.filter(
        (p) =>
          String(p.title).toLowerCase().includes(q) ||
          String(p.description).toLowerCase().includes(q)
      );
    }
    const lastPage = Math.max(1, Math.ceil(filtered.length / size));
    const currentPage = Math.min(pageNo, lastPage);
    const slice = filtered.slice((currentPage - 1) * size, currentPage * size);

    await route.fulfill(
      jsonResponse({
        success: true,
        message: "ok",
        data: slice,
        meta: {
          current_page: currentPage,
          per_page: size,
          total: filtered.length,
          last_page: lastPage,
        },
      })
    );
  });
}

/** Owner dashboard endpoints (GET /dashboard/idea-owner + secondary lists). */
async function mockOwnerDashboard(page, { projects = [] } = {}) {
  const list = projects.length ? projects : makeDemoProjects(3);
  await mockApi(page, "GET", "dashboard/idea-owner", async (route) => {
    await route.fulfill(
      jsonResponse(
        envelope({
          project_stats: { total: list.length, published: list.length, drafts: 0 },
          interest_stats: { total: 0, pending: 0, accepted: 0 },
          projects: list,
        })
      )
    );
  });
  await mockApi(page, "GET", "interests/received", async (route) => {
    await route.fulfill(jsonResponse({ success: true, message: "ok", data: [], meta: emptyMeta() }));
  });
  await mockApi(page, "GET", "trashed-projects", async (route) => {
    await route.fulfill(jsonResponse({ success: true, message: "ok", data: [], meta: emptyMeta() }));
  });
}

/** Investor dashboard endpoints (GET /dashboard/investor + secondary lists). */
async function mockInvestorDashboard(page, { projects = [] } = {}) {
  const list = projects.length ? projects : makeDemoProjects(3);
  await mockApi(page, "GET", "dashboard/investor", async (route) => {
    await route.fulfill(
      jsonResponse(
        envelope({
          suggested_projects: list,
          saved_count: 0,
          interest_stats: { total: 0, pending: 0, accepted: 0 },
        })
      )
    );
  });
  await mockApi(page, "GET", "saved-projects", async (route) => {
    await route.fulfill(jsonResponse({ success: true, message: "ok", data: [], meta: emptyMeta() }));
  });
  await mockApi(page, "GET", "interests/sent", async (route) => {
    await route.fulfill(jsonResponse({ success: true, message: "ok", data: [], meta: emptyMeta() }));
  });
}

/** Fill the 6 OTP inputs (aria-label "الرقم 1"…"الرقم 6" / "Digit 1"…) and submit. */
async function fillOtp(page, testInfo, code) {
  const prefix = lang(testInfo) === "ar" ? "الرقم" : "Digit";
  for (let i = 0; i < code.length; i++) {
    await page.getByLabel(`${prefix} ${i + 1}`).fill(code[i]);
  }
  await page.getByRole("button", { name: t(testInfo, "تحقق", "Verify") }).click();
}

module.exports = {
  API,
  APP_ORIGIN,
  PAGE_SIZE,
  lang,
  appPath,
  t,
  tExact,
  envelope,
  jsonResponse,
  addAuthCookies,
  mockApi,
  mockRegister,
  mockVerifyOtp,
  mockLogin,
  mockOAuth,
  mockCategories,
  mockTagSuggestions,
  mockSearchSuggestions,
  mockProjectCreate,
  makeApiProject,
  makeDemoProjects,
  mockProjectsList,
  mockOwnerDashboard,
  mockInvestorDashboard,
  fillOtp,
};
