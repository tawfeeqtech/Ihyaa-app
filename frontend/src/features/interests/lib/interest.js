/**
 * EPIC-08 — Interests API client (US-042/044/045/046).
 *
 * Contract source: specs/003-sprint3-interest-connection/contracts/interest-api.md
 * (SRS-API-22..27). All JSON calls go through `@/shared/lib/api`, which unwraps
 * the { success, message, data } envelope and preserves `meta` for paginated
 * responses. Validation failures surface as `err.body.code` (e.g.
 * `duplicate_interest`) so callers can translate them.
 *
 * الدستور §I: the counterpart email is only ever present on a row once the
 * request is `accepted` — never before. That rule is enforced by the backend;
 * this client simply surfaces whatever `emails` the payload carries.
 */

import { api, API_BASE_URL, AUTH_COOKIE } from "@/shared/lib/api";

/** Statuses that still allow the sending investor to cancel (UC-12 / UC-07 E2). */
export const CANCELLABLE_STATUSES = ["pending", "accepted", "accepted_pending_document"];

/**
 * POST /projects/{project}/interest — investor only (SRS-API-22).
 * `interest_type` is mandatory (investment | technical_development | consultation);
 * `message` is optional (≤ 500 chars). Resolves to the created interest.
 */
export async function sendInterest(projectId, { interest_type, message = "" }) {
  return api.post(`/projects/${projectId}/interest`, { interest_type, message });
}

/**
 * GET /interests/received — idea-owner only (SRS-API-23).
 * `status` may be a single value or comma-combined ("pending,accepted").
 * Resolves to { data, meta, counters }.
 */
export async function fetchReceived({ status, page = 1, perPage = 12 } = {}) {
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  if (status) params.set("status", status);
  return api.get(`/interests/received?${params.toString()}`);
}

/**
 * GET /interests/sent — investor only (SRS-API-24).
 * Same paginated shape as `fetchReceived`.
 */
export async function fetchSent({ status, page = 1, perPage = 12 } = {}) {
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  if (status) params.set("status", status);
  return api.get(`/interests/sent?${params.toString()}`);
}

/**
 * PUT /interests/{interest}/accept — project owner only (SRS-API-25).
 * Moves the request to `accepted`, creates the PDF agreement and discloses
 * the investor email. Resolves to the updated interest.
 */
export async function acceptInterest(id) {
  return api.put(`/interests/${id}/accept`, {});
}

/**
 * PUT /interests/{interest}/reject — project owner only (SRS-API-26).
 * `rejection_reason` is optional (≤ 500 chars).
 */
export async function rejectInterest(id, rejection_reason = "") {
  return api.put(`/interests/${id}/reject`, { rejection_reason });
}

/**
 * PUT /interests/{interest}/cancel — the sending investor only (UC-12 / UC-07 E2).
 * Soft-cancel: the request flips to `cancelled`. This is the canonical cancel
 * route (dashboard-api.md §2.sent_interests.can_cancel); `cancelInterest`
 * (DELETE) is retained for legacy callers.
 */
export async function cancelSentInterest(id) {
  return api.put(`/interests/${id}/cancel`, {});
}

/**
 * DELETE /interests/{interest} — legacy cancel for the sending investor.
 * Prefer `cancelSentInterest` (PUT) — the DELETE route is deprecated.
 */
export async function cancelInterest(id) {
  return api.delete(`/interests/${id}`);
}

/**
 * GET /agreements/{agreement}/meta — one of the two parties (SRS-API-27).
 * Resolves to agreement metadata (parties, emails, pdf_url, created_at).
 */
export async function fetchAgreementMeta(id) {
  return api.get(`/agreements/${id}/meta`);
}

/** Read a browser cookie (client-side only). */
function readCookie(name) {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * GET /agreements/{agreement} — raw PDF download (SRS-API-27).
 * `api.get` expects JSON, so we fetch the blob directly with the Bearer token
 * and hand back an object URL for preview/download. The caller revokes it.
 */
export async function fetchAgreementPdf(id) {
  const token = readCookie(AUTH_COOKIE);
  const res = await fetch(`${API_BASE_URL}/agreements/${id}`, {
    headers: {
      Accept: "application/pdf",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const error = new Error(`Failed to fetch PDF (${res.status})`);
    error.status = res.status;
    throw error;
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/**
 * Normalize one API interest row (received or sent) into the shape the boards
 * consume. `agreement_id` may arrive directly or nested under `agreement.id`
 * (accept response). `emails` carries the counterpart email only when accepted.
 */
export function mapApiInterest(i) {
  return {
    id: i.id,
    project: i.project ?? null,
    investor: i.investor ?? null,
    interest_type: i.interest_type ?? "investment",
    message: i.message ?? "",
    status: i.status ?? "pending",
    rejection_reason: i.rejection_reason ?? null,
    agreement_id: i.agreement?.id ?? i.agreement_id ?? null,
    accepted_at: i.accepted_at ?? null,
    rejected_at: i.rejected_at ?? null,
    cancelled_at: i.cancelled_at ?? null,
    created_at: i.created_at ?? null,
    emails: i.emails ?? {},
    can_cancel: Boolean(i.can_cancel),
  };
}
