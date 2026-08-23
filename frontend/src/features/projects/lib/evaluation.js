/**
 * AI Evaluation — API client for evaluation status/history/actions (EPIC-03/04).
 *
 * These helpers wrap the Laravel endpoints documented in evaluation-api.md:
 *   GET  /projects/{project}/evaluation-status             (owner-only)
 *   GET  /projects/{project}/evaluations?include=comparison (comparison owner-only)
 *   POST /projects/{project}/re-evaluate                   (owner-only, confirm:true)
 *   POST /projects/{project}/evaluations/{evaluation}/retry (owner-only, failed state)
 *
 * All responses follow the Laravel { success, message, data } envelope, which
 * the shared `api` client unwraps to `data` automatically.
 */

import { api } from "@/shared/lib/api";

/**
 * Fetch the live evaluation status (T052 · SRS-API-47).
 *
 * Owner-only endpoint — non-owners / guests get 403, which the caller should
 * swallow (the badge is only rendered for the owner anyway).
 *
 * @param {string|number} projectId
 * @returns {Promise<Object|null>} Status object or null when the request fails.
 */
export async function fetchEvaluationStatus(projectId) {
  if (!projectId) return null;
  try {
    return await api.get(`/projects/${projectId}/evaluation-status`);
  } catch {
    // 401/403 (guest / not the owner) — the caller decides whether to surface it.
    return null;
  }
}

/**
 * Fetch the evaluation history — last 5 COMPLETED evaluations, newest first
 * (T063 · SRS-API-19 / US-018/023).
 *
 * @param {string|number} projectId
 * @param {{ includeComparison?: boolean }} [options] `includeComparison` adds
 *   the owner-only `comparison` array (version-over-version dimension scores)
 *   feeding the EvaluationComparisonChart (T084 · US-023).
 * @returns {Promise<{ evaluations: Array<Object>, meta: Object, comparison?: Array<Object> }|null>}
 */
export async function fetchEvaluationHistory(projectId, { includeComparison = false } = {}) {
  if (!projectId) return null;
  try {
    const query = includeComparison ? "?include=comparison" : "";
    return await api.get(`/projects/${projectId}/evaluations${query}`);
  } catch {
    // 403 — disclosure level too low for dimensions/history.
    return null;
  }
}

/**
 * Request a full re-evaluation (T076 · SRS-AI-C02 / FR-222).
 *
 * Requires owner + `confirm: true`. The backend replies:
 *   202 created        → evaluation queued
 *   200 cached         → still in the 24h cooldown, returns the last report
 *   429 COOLDOWN_ACTIVE→ err.body.data.next_evaluation_at / retry_after_seconds
 *   422 CONFIRMATION_REQUIRED → `confirm` missing/false
 *
 * @param {string|number} projectId
 * @param {boolean} [confirm=true]
 * @returns {Promise<Object>} Created evaluation payload (unwrapped `data`).
 */
export async function postReevaluate(projectId, confirm = true) {
  return api.post(`/projects/${projectId}/re-evaluate`, { confirm });
}

/**
 * Retry a FAILED evaluation (T073 · SRS-AI-E03 / SRS-AI-E05).
 *
 * Owner-only; the endpoint replies 202 on success and 422 NOT_FAILED when the
 * latest evaluation is not in a retryable (failed) state.
 *
 * @param {string|number} projectId
 * @param {string|number} evaluationId
 * @returns {Promise<Object>} Retry confirmation (unwrapped `data`).
 */
export async function postRetry(projectId, evaluationId) {
  return api.post(`/projects/${projectId}/evaluations/${evaluationId}/retry`);
}
