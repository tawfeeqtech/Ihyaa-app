/**
 * EPIC-10 · Idea-owner dashboard data access (US-051/052/053/055 · T053/T064/T075).
 *
 * Server-component fetches go straight to the Laravel API with the `ihyaa_token`
 * cookie (next/headers) and `cache: "no-store"` — the dashboard is computed on
 * every load (SRS-F10-01..03). Mutations (restore / force-delete) stay in the
 * browser via the shared `api` client, which reads the cookie client-side.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

/** Read the auth token from the request cookies (server components only). */
async function authHeaders() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const token = cookieStore.get("ihyaa_token")?.value;
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * GET /api/dashboard/idea-owner — the full owner dashboard payload:
 * `{ kpis, projects, feed }` (dashboard-api.md §1). Resolves to `body.data`.
 */
export async function fetchOwnerDashboard() {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/dashboard/idea-owner`, { headers, cache: "no-store" });
  if (!res.ok) return null;
  const body = await res.json();
  return body?.data ?? body;
}

/**
 * GET /api/trashed-projects — the owner's trash list, newest deletion first
 * (trash-api.md §1). Resolves to the items array.
 */
export async function fetchTrash() {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/trashed-projects`, { headers, cache: "no-store" });
  if (!res.ok) return null;
  const body = await res.json();
  return body?.data ?? body;
}
