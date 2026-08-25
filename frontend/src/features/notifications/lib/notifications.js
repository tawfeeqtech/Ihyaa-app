/**
 * EPIC-09 — Notifications API client (US-047/048/049 · T065/T067).
 *
 * Contract source: specs/003-sprint3-interest-connection/contracts/notifications-api.md
 * (SRS-API-28..31 · RL-SH-05..08). All JSON calls go through `@/shared/lib/api`,
 * which unwraps the { success, message, data } envelope and preserves `meta`
 * for paginated responses.
 *
 * Envelope note: `api.get` returns `{ data, meta }` only when the body carries
 * a `meta` key; otherwise it unwraps to `body.data`. The `recent` and
 * `read-all` endpoints return extras (unread_count) at the TOP level of the
 * envelope (Laravel `success($data, ..., $meta)` merges them at top level), so
 * those extras are dropped by `api.get`. The badge is therefore always sourced
 * from `GET /notifications/unread-count` (payload nested in `data`, which
 * unwraps cleanly), and read-all updates the store locally to 0.
 */

import { api } from "@/shared/lib/api";

export const NOTIFICATIONS_PAGE_SIZE = 20;
export const NOTIFICATIONS_RECENT_LIMIT = 5;

/**
 * GET /notifications — paginated, 20/page, newest first (SRS-API-28 · T065).
 * Resolves to { data, meta } where meta carries unread_count.
 */
export async function fetchNotifications({ page = 1, perPage = NOTIFICATIONS_PAGE_SIZE } = {}) {
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  return api.get(`/notifications?${params.toString()}`);
}

/**
 * GET /notifications/recent — the last 5 for the bell (SRS-API-29 · T069).
 * Resolves to the array of notifications (top-level unread_count is dropped by
 * api.get — use `fetchUnreadCount` for the badge).
 */
export async function fetchRecent() {
  return api.get("/notifications/recent");
}

/**
 * GET /notifications/unread-count — the bell badge (SRS-API-31 · RL-SH-08 · T068).
 * Resolves to { unread_count }.
 */
export async function fetchUnreadCount() {
  return api.get("/notifications/unread-count");
}

/**
 * PUT /notifications/{notification}/read — idempotent (SRS-API-30 · T067).
 * Resolves to the updated notification resource.
 */
export async function markNotificationRead(id) {
  return api.put(`/notifications/${id}/read`, {});
}

/**
 * PUT /notifications/read-all — marks everything read (SRS-API-30 · T067).
 * Resolves to { marked } (top-level unread_count dropped by api.get).
 */
export async function markAllNotificationsRead() {
  return api.put("/notifications/read-all", {});
}

/**
 * Normalize one API notification row into the shape the bell / page consume.
 */
export function mapApiNotification(n) {
  return {
    id: n.id,
    type: n.type ?? "generic",
    title: n.title ?? "",
    body: n.body ?? "",
    data: n.data ?? {},
    is_critical: Boolean(n.is_critical),
    read_at: n.read_at ?? null,
    created_at: n.created_at ?? null,
    created_at_relative: n.created_at_relative ?? null,
    url: n.url ?? null,
    is_read: Boolean(n.read_at),
  };
}
