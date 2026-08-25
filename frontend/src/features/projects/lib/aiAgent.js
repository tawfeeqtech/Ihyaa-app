/**
 * EPIC-15 — AI Agent (Project Analysis) API client (US-080..084).
 *
 * Contract: specs/003-sprint3-interest-connection/contracts/ai-agent-api.md
 * (SRS-API-42/43 · RL-AI-01/02). JSON calls go through `@/shared/lib/api`
 * (which unwraps the { success, message, data } envelope); the PDF export is a
 * raw blob fetch with the Bearer token, mirroring `fetchAgreementPdf`.
 *
 * الدستور VI: text/template only — no external MCP in MVP.
 */

import { api, API_BASE_URL, AUTH_COOKIE } from "@/shared/lib/api";

/** The three analysis types the agent supports (AnalysisType enum). */
export const ANALYSIS_TYPES = ["comparison", "swot", "competitive"];

/**
 * POST /ai/analyze/{project} — idea-owner only (RL-AI-01 · 3/min per user+project).
 * `analysis_type` ∈ {comparison, swot, competitive}; `language` ar|en (default ar).
 * Resolves to the 202 payload:
 *   { artifact_id, project_id, analysis_type, version, status: "processing", message }.
 * Errors: 403 (not owner), 422 PROJECT_NOT_EVALUATED, 409 ANALYSIS_IN_PROGRESS.
 */
export async function startAnalysis(projectId, analysisType, language = "ar") {
  return api.post(`/ai/analyze/${projectId}`, {
    analysis_type: analysisType,
    language,
  });
}

/**
 * GET /projects/{project}/ai-analysis?type= — latest artifact per type (owner only).
 * Resolves to an array of the latest artifacts (one per type, or filtered by ?type=).
 */
export async function fetchProjectArtifacts(projectId, type) {
  const params = type ? `?type=${type}` : "";
  return api.get(`/projects/${projectId}/ai-analysis${params}`);
}

/**
 * GET /ai/analysis/{artifact} — a single artifact (owner only, RL-AI-02 · 10/min).
 */
export async function fetchAgentArtifact(id) {
  return api.get(`/ai/analysis/${id}`);
}

/** Read a browser cookie (client-side only). */
function readCookie(name) {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * GET /ai/analysis/{artifact}/export — raw PDF download (owner only).
 * 409 ANALYSIS_INCOMPLETE when the artifact hasn't completed. Resolves to an
 * object URL for the caller to download; the caller revokes it.
 */
export async function fetchAgentPdf(id) {
  const token = readCookie(AUTH_COOKIE);
  const res = await fetch(`${API_BASE_URL}/ai/analysis/${id}/export`, {
    headers: {
      Accept: "application/pdf",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const error = new Error(body?.message ?? `Failed to fetch PDF (${res.status})`);
    error.status = res.status;
    error.body = body;
    throw error;
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/**
 * Normalize one AiAgentArtifact API row into the shape the report view consumes.
 * Keeps only the fields the UI reads; drops nothing the API sends.
 */
export function mapAgentArtifact(a) {
  return {
    id: a.id,
    project_id: a.project_id,
    analysis_type: a.analysis_type ?? null,
    artifact_data: a.artifact_data ?? {},
    version: a.version ?? 1,
    status: a.status ?? "processing",
    model_used: a.model_used ?? null,
    language: a.language ?? "ar",
    error_message: a.error_message ?? null,
    created_at: a.created_at ?? null,
  };
}
