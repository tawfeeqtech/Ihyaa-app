/**
 * AI Evaluation Report — API helper + shape mappers (EPIC-05 · report-api.md §1).
 *
 * The single source for the frontend report page is the report-data endpoint:
 *   GET /api/projects/{project}/evaluations/{evaluation}
 * which returns `radar_chart.axes` (built from the STORED result — US-025-S2),
 * `evaluation.dimensions`, `gap_analysis`, `recommendations`,
 * `required_skills`, `team_meta` and `export` shaped by the disclosure matrix.
 */

import { api } from "@/shared/lib/api";

/** Backend dimension keys → the short keys the UI components expect. */
export const DIMENSION_KEY_MAP = {
  technical_quality: "technical",
  innovation: "innovation",
  market_viability: "market",
  team_completeness: "team",
  documentation: "documentation",
};

/** Reverse: short UI key → backend dimension key (for radar axis values). */
export const SHORT_TO_DIMENSION = Object.fromEntries(
  Object.entries(DIMENSION_KEY_MAP).map(([long, short]) => [short, long])
);

/**
 * Gap category key → the dimension it is measured against (T099).
 * Every gap category is visually linked to the score of its companion dimension.
 */
export const GAP_TO_DIMENSION = {
  technical_gaps: "technical_quality",
  market_gaps: "market_viability",
  team_gaps: "team_completeness",
  documentation_gaps: "documentation",
};

/** Canonical gap-category order (display order = the 4 fixed categories). */
export const GAP_CATEGORIES = [
  "technical_gaps",
  "market_gaps",
  "team_gaps",
  "documentation_gaps",
];

/**
 * Fetch the report JSON for an evaluation, honouring the viewer's disclosure
 * level server-side (the endpoint returns 401/403/404 as appropriate).
 *
 * @returns {Promise<Object|null>} The shaped report `data` (see report-api.md §1)
 *   or null when the request fails (404 pending/failed, 403 insufficient level).
 */
export async function fetchReportData(projectId, evaluationId) {
  if (!projectId || !evaluationId) return null;
  try {
    return await api.get(`/projects/${projectId}/evaluations/${evaluationId}`);
  } catch (err) {
    // 404 (no report yet / wrong project), 403 (insufficient disclosure level)
    // and 401 (guest) are all "no full report" conditions for the UI.
    return null;
  }
}

/**
 * Convert `radar_chart.axes` (backend, full dimension keys) into the shape the
 * RadarChart component consumes: a short-key score map + translated labels.
 *
 * Axes only include COMPLETED dimensions — partial reports render the finished
 * ones, with the missing ones passed separately via `partialDimensions`.
 *
 * @param {Array<{dimension:string, value:number, label_ar?:string, label_en?:string}>} axes
 * @param {'ar'|'en'} locale
 */
export function mapRadarAxes(axes = [], locale = "ar") {
  const dimensions = {};
  const labels = [];
  axes.forEach((axis) => {
    const short = DIMENSION_KEY_MAP[axis.dimension] ?? axis.dimension;
    dimensions[short] = axis.value;
    labels.push(locale === "ar" ? (axis.label_ar ?? short) : (axis.label_en ?? axis.label_ar ?? short));
  });
  return { dimensions, labels };
}

/**
 * Derive the missing-dimension list for the radar (partial report — T095) from
 * `evaluation.partial_dimensions` (backend full keys) or absent axes.
 *
 * Both `key` and `label` are the SHORT UI keys (e.g. `team`) so the caller can
 * translate the label via `report.dimensions.{key}`.
 *
 * @returns {Array<{key:string, label:string}>}
 */
export function missingRadarDimensions(evaluation = {}, axes = []) {
  const present = new Set((axes ?? []).map((a) => a.dimension));
  const partial = Array.isArray(evaluation?.partial_dimensions)
    ? evaluation.partial_dimensions
    : [];

  // Only treat as missing when the axis is genuinely absent from radar_chart.axes.
  return partial
    .filter((key) => !present.has(key))
    .map((key) => {
      const short = DIMENSION_KEY_MAP[key] ?? key;
      return { key: short, label: short };
    });
}
