/**
 * Ihyaa API client — thin fetch wrapper for the Laravel backend.
 *
 * Usage:
 *   import { api } from "@/shared/lib/api";
 *   const data = await api.get("/projects");
 *   const result = await api.post("/login", { email, password });
 *
 * The Authorization header is read from the `ihyaa_token` cookie (set by
 * the backend response and mirrored by the frontend auth flow). The client
 * works in both server and client components.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

/** Exported so feature clients can do raw fetches (e.g. PDF blobs) against the API. */
export const API_BASE_URL = BASE_URL;

export const AUTH_COOKIE = "ihyaa_token";
export const ROLE_COOKIE = "ihyaa_role";
export const NAME_COOKIE = "ihyaa_name";
export const EMAIL_COOKIE = "ihyaa_email";
export const VERIFIED_COOKIE = "ihyaa_verified";

/** Read a cookie by name — works in the browser (server-side use `next/headers`). */
function getCookie(name) {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * الدستور V: حساب غير مفعّل البريد → توجيه تلقائي لصفحة OTP بدل عرض خطأ 403 خام.
 * يُستدعى عند أي استجابة 403 برمز EMAIL_NOT_VERIFIED (EnsureEmailVerified middleware).
 * البريد يُقرأ من كوكي `ihyaa_email` إن وُجد؛ وإلا تُفتح الصفحة بدون بريد.
 */
function redirectToVerifyOtp() {
  if (typeof window === "undefined") return;
  const email = getCookie(EMAIL_COOKIE) ?? "";
  const locale = window.location.pathname.split("/")[1] || "ar";
  const url = `/${locale}/verify-otp${email ? `?email=${encodeURIComponent(email)}` : ""}`;
  window.location.replace(url);
}

/** تنفيذ مشترك لمعالجة الاستجابات غير الناجحة (يضيف التوجيه لصفحة OTP عند الحاجة). */
function makeError(res, body) {
  // 403 EMAIL_NOT_VERIFIED = المستخدم مسجّل الدخول لكن بريده غير مفعّل.
  if (res.status === 403 && body?.code === "EMAIL_NOT_VERIFIED") {
    redirectToVerifyOtp();
  }
  const error = new Error(body?.message ?? `Request failed (${res.status})`);
  error.status = res.status;
  error.body = body;
  error.headers = res.headers;
  return error;
}

/** Shared fetch with auth headers and unified error handling. */
async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const token = getCookie(AUTH_COOKIE);

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(url, {
    ...options,
    headers,
    // Pass credentials for CORS (Sanctum uses token auth, not cookies).
  });

  // 204 No Content
  if (res.status === 204) return null;

  const body = res.ok ? await res.json() : await res.json().catch(() => null);

  if (!res.ok) {
    throw makeError(res, body);
  }

  // Laravel wraps successful payloads in { success, message, data }. Unwrap
  // `data` so callers receive the actual resource — e.g. api.post("/login")
  // resolves to { token, token_expires_at, user }.
  //
  // Paginated responses additionally carry a top-level `meta` object
  // ({ current_page, per_page, total, last_page, ... }). Preserve it so
  // callers can read both `res.data` (the items) and `res.meta` (pagination).
  // Endpoints without `meta` keep unwrapping to just `data` for backward
  // compatibility.
  if (body && typeof body === "object" && "data" in body) {
    return "meta" in body ? { data: body.data, meta: body.meta } : body.data;
  }
  return body;
}

/**
 * Upload multipart/form-data (files). Unlike `request`, this does NOT set a
 * JSON Content-Type — the browser sets it with the multipart boundary.
 */
async function uploadRequest(path, formData, options = {}) {
  const url = `${BASE_URL}${path}`;
  const token = getCookie(AUTH_COOKIE);

  const res = await fetch(url, {
    ...options,
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: formData,
  });

  if (res.status === 204) return null;

  const body = res.ok ? await res.json() : await res.json().catch(() => null);

  if (!res.ok) {
    throw makeError(res, body);
  }

  if (body && typeof body === "object" && "data" in body) {
    return "meta" in body ? { data: body.data, meta: body.meta } : body.data;
  }
  return body;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: "GET" }),
  post: (path, data, opts) =>
    request(path, { ...opts, method: "POST", body: JSON.stringify(data) }),
  put: (path, data, opts) =>
    request(path, { ...opts, method: "PUT", body: JSON.stringify(data) }),
  patch: (path, data, opts) =>
    request(path, { ...opts, method: "PATCH", body: JSON.stringify(data) }),
  delete: (path, opts) => request(path, { ...opts, method: "DELETE" }),
  upload: (path, formData, opts) => uploadRequest(path, formData, opts),
};

/**
 * Set auth cookies after successful login/register.
 * Mirrors the backend token + user data into browser cookies so the
 * middleware and AuthProvider can read them.
 */
export function setAuthCookies(token, user, remember = false) {
  const maxAge = remember ? "max-age=2592000" : "max-age=86400";
  const email = user?.email ?? "";
  const emailVerified = user?.email_verified ?? true; // OAuth: بريد موثوق من المزود افتراضياً

  document.cookie = `${AUTH_COOKIE}=${token};path=/;${maxAge};samesite=lax`;
  document.cookie = `${ROLE_COOKIE}=${user.role};path=/;${maxAge};samesite=lax`;
  document.cookie = `${NAME_COOKIE}=${encodeURIComponent(user.name)};path=/;${maxAge};samesite=lax`;
  document.cookie = `${EMAIL_COOKIE}=${encodeURIComponent(email)};path=/;${maxAge};samesite=lax`;
  document.cookie = `${VERIFIED_COOKIE}=${emailVerified ? "1" : "0"};path=/;${maxAge};samesite=lax`;
  localStorage.setItem(
    "ihyaa_user",
    JSON.stringify({ name: user.name, role: user.role, email, emailVerified })
  );
}

/** Clear all auth cookies (logout). */
export function clearAuthCookies() {
  for (const name of [AUTH_COOKIE, ROLE_COOKIE, NAME_COOKIE, EMAIL_COOKIE, VERIFIED_COOKIE]) {
    document.cookie = `${name}=;path=/;max-age=0`;
  }
  localStorage.removeItem("ihyaa_user");
}
