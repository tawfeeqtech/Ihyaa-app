/**
 * EPIC-12 — Admin analytics API client (US-061..064).
 *
 * Contract source: specs/003-sprint3-interest-connection/contracts/admin-api.md
 * (SRS-API-40/41). Only the admin role can call these endpoints; the backend
 * enforces it with the admin middleware (403 otherwise).
 *
 * الدستور IV: لا يوجد تسجيل عام لدور المشرف — يُنشأ عبر database seeder فقط،
 * لذا هذه الدوال تُستخدم حصرياً من صفحة `/admin/analytics` المحمية بالـ middleware.
 */

import { api, API_BASE_URL, AUTH_COOKIE } from "@/shared/lib/api";

/**
 * GET /admin/analytics — admin only (SRS-API-40).
 * Resolves to the full analytics payload: users, projects, avg_ai_score,
 * sector_distribution, active_users_7d, interests, chart_sufficient.
 */
export async function fetchAnalytics() {
  return api.get("/admin/analytics");
}

/**
 * GET /admin/analytics/export — admin only (SRS-API-41).
 *
 * The JSON `api.get` client can't read the CSV stream, so we fetch the blob
 * directly with the Bearer token and trigger a browser download — the same
 * pattern as the agreement PDF (EPIC-08). The file is UTF-8 with BOM so Arabic
 * opens correctly in Excel, and carries a `Content-Disposition` filename like
 * `ihyaa-analytics-2026-08-25.csv`. The object URL is revoked right after.
 */
export async function downloadAnalyticsCsv() {
  const token = readCookie(AUTH_COOKIE);
  const res = await fetch(`${API_BASE_URL}/admin/analytics/export`, {
    headers: {
      Accept: "text/csv, application/octet-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const error = new Error(`Failed to export CSV (${res.status})`);
    error.status = res.status;
    throw error;
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^";]+)"?/);

  const link = document.createElement("a");
  link.href = url;
  link.download = match?.[1] ?? "ihyaa-analytics.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Read a browser cookie (client-side only). */
function readCookie(name) {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}
