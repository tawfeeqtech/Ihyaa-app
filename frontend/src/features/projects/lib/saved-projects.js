/**
 * EPIC-11 — Saved-projects API client (US-059 · T094).
 *
 * Contract source: specs/004-sprint4-dashboards-polish/contracts/dashboard-api.md
 * §2.saved_projects (SRS-API-39) + SavedProjectsController routes:
 *   GET    /api/saved-projects
 *   POST   /api/projects/{project}/save     → 201 on create, 200 on duplicate (idempotent)
 *   DELETE /api/projects/{project}/save     → removed (idempotent)
 *
 * The dashboard aggregate already carries `saved_projects`, so this client is
 * only used for the standalone saved-projects page, the ProjectDetail save
 * button, and toggling after a save/remove.
 */

import { api } from "@/shared/lib/api";

/** GET /saved-projects — newest first. Resolves to { data, meta }. */
export async function fetchSavedProjects({ page = 1, perPage = 100 } = {}) {
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  return api.get(`/saved-projects?${params.toString()}`);
}

/** POST /projects/{project}/save — idempotent; resolves to the saved row. */
export async function saveProject(projectId) {
  return api.post(`/projects/${projectId}/save`, {});
}

/** DELETE /projects/{project}/save — idempotent. */
export async function unsaveProject(projectId) {
  return api.delete(`/projects/${projectId}/save`);
}

/**
 * True when a project id appears in a saved-projects list (dashboard shape:
 * { saved_id, project: { id, ... } } or flat { project_id }).
 */
export function isProjectSaved(projectId, savedList) {
  const id = Number(projectId);
  return (Array.isArray(savedList) ? savedList : []).some((row) => {
    const candidate = row?.project_id ?? row?.project?.id ?? row?.id;
    return Number(candidate) === id;
  });
}
