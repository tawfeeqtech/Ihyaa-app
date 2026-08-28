import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { ProjectDetail } from "@/features/projects/components/ProjectDetail";
import { ProjectLoadError } from "@/features/projects/components/ProjectLoadError";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

/**
 * Transform the Laravel API response into the shape the ProjectDetail
 * component expects (legacy mock-data format). This is a temporary bridge;
 * ideally the component should be refactored to consume the API shape
 * directly.
 */
function mapApiToLegacy(api) {
  const evaluation = api.evaluation ?? {};
  // Actual evaluation report shape (Evaluation::toReportArray): `scores` is a
  // map of full dimension names → { score, sub_scores, strengths, weaknesses, ... }.
  const scores = evaluation.scores ?? {};

  return {
    id: String(api.id),
    title: { ar: api.title, en: api.title },
    description: { ar: api.description ?? "", en: api.description ?? "" },
    sector: api.category?.slug ?? "other",
    status: api.state ?? api.status ?? "needs_funding",
    aiScore: Math.round(api.ai_score ?? 0),
    // Disclosure level for the AI report (none | overall | dimensions | full).
    // The backend derives it from the requesting user; fall back to the most
    // conservative value so nothing is leaked when the field is missing.
    report_access: api.report_access ?? "none",
    // Whether the current viewer owns this project (owner-only actions such as
    // re-evaluate / comparison, SRS-AI-C02, US-023). The backend does not expose
    // this yet, so ProjectDetail falls back to role+report_access heuristics.
    is_owner: Boolean(api.is_owner),
    // Latest evaluation id — needed to fetch the full report JSON (EPIC-05).
    evaluationId: evaluation?.id ?? null,
    dimensions: {
      technical: scores.technical_quality?.score ?? null,
      innovation: scores.innovation?.score ?? null,
      market: scores.market_viability?.score ?? null,
      team: scores.team_completeness?.score ?? null,
      documentation: scores.documentation?.score ?? null,
    },
    swot: {
      strengths: (evaluation.swot?.strengths ?? []).map((s) => ({ ar: s, en: s })),
      weaknesses: (evaluation.swot?.weaknesses ?? []).map((s) => ({ ar: s, en: s })),
      opportunities: (evaluation.swot?.opportunities ?? []).map((s) => ({ ar: s, en: s })),
      threats: (evaluation.swot?.threats ?? []).map((s) => ({ ar: s, en: s })),
    },
    owner: {
      name: api.owner?.name ?? "Unknown",
      role: { ar: api.owner?.role === "investor" ? "مستثمر" : "صاحب فكرة", en: api.owner?.role === "investor" ? "Investor" : "Idea Owner" },
      joinedAt: api.created_at ?? api.createdAt ?? new Date().toISOString(),
    },
    interested: api.interested_count ?? 0,
    views: api.view_count ?? 0,
    budget: api.budget?.max ?? api.budget_min ?? 0,
    videoUrl: api.video?.url ?? null,
    videoProvider: api.video?.provider ?? null,
    // Attachments (image/pdf/document) as returned by ProjectFile::toArrayApi().
    files: Array.isArray(api.files) ? api.files : [],
    repoUrl: api.github_url ?? null,
    createdAt: api.created_at ?? new Date().toISOString(),
  };
}

/**
 * Fetch a project, distinguishing a real 404 (notFound) from any other failure
 * (network error, 5xx, …) so a dropped connection is shown as a retryable
 * error state instead of a misleading "not found" page.
 */
async function fetchProject(id) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ihyaa_token")?.value;

    const headers = {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(`${API_BASE}/projects/${id}`, { headers, cache: "no-store" });
    if (res.status === 404) return { ok: false, notFound: true };
    if (!res.ok) return { ok: false, notFound: false, status: res.status };
    // API envelope is { success, message, data } — unwrap the project object.
    const body = await res.json();
    return { ok: true, data: body?.data ?? body };
  } catch {
    return { ok: false, notFound: false };
  }
}

export default async function ProjectDetailPage({ params }) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const result = await fetchProject(id);
  if (!result.ok) {
    // A genuine 404 → Next.js not-found page. Anything else (network/5xx) →
    // retryable error state instead of notFound().
    if (result.notFound) notFound();
    return <ProjectLoadError />;
  }

  const project = mapApiToLegacy(result.data);
  return <ProjectDetail project={project} />;
}
