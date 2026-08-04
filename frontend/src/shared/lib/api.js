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

export const AUTH_COOKIE = "ihyaa_token";
export const ROLE_COOKIE = "ihyaa_role";
export const NAME_COOKIE = "ihyaa_name";

/** Read a cookie by name — works in the browser (server-side use `next/headers`). */
function getCookie(name) {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
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
    const error = new Error(body?.message ?? `Request failed (${res.status})`);
    error.status = res.status;
    error.body = body;
    throw error;
  }

  // Laravel wraps successful payloads in { success, message, data }. Unwrap
  // `data` so callers receive the actual resource — e.g. api.post("/login")
  // resolves to { token, token_expires_at, user }.
  return body && typeof body === "object" && "data" in body ? body.data : body;
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
};

/**
 * Set auth cookies after successful login/register.
 * Mirrors the backend token + user data into browser cookies so the
 * middleware and AuthProvider can read them.
 */
export function setAuthCookies(token, user, remember = false) {
  const maxAge = remember ? "max-age=2592000" : "max-age=86400";
  document.cookie = `${AUTH_COOKIE}=${token};path=/;${maxAge};samesite=lax`;
  document.cookie = `${ROLE_COOKIE}=${user.role};path=/;${maxAge};samesite=lax`;
  document.cookie = `${NAME_COOKIE}=${encodeURIComponent(user.name)};path=/;${maxAge};samesite=lax`;
  localStorage.setItem("ihyaa_user", JSON.stringify({ name: user.name, role: user.role }));
}

/** Clear all auth cookies (logout). */
export function clearAuthCookies() {
  for (const name of [AUTH_COOKIE, ROLE_COOKIE, NAME_COOKIE]) {
    document.cookie = `${name}=;path=/;max-age=0`;
  }
  localStorage.removeItem("ihyaa_user");
}
