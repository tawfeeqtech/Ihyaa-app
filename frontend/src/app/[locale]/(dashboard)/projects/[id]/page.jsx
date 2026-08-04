import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { ProjectDetail } from "@/features/projects/components/ProjectDetail";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

/**
 * Transform the Laravel API response into the shape the ProjectDetail
 * component expects (legacy mock-data format). This is a temporary bridge;
 * ideally the component should be refactored to consume the API shape
 * directly.
 */
function mapApiToLegacy(api) {
  const evaluation = api.evaluation ?? {};
  const dims = evaluation.dimension_scores ?? {};

  return {
    id: String(api.id),
    title: { ar: api.title, en: api.title },
    description: { ar: api.description ?? "", en: api.description ?? "" },
    sector: api.category?.slug ?? "tech",
    status: api.status ?? "needs_funding",
    aiScore: api.ai_score ?? 0,
    dimensions: {
      technical: dims.technical_quality ?? dims.technical ?? 60,
      innovation: dims.innovation ?? 60,
      market: dims.market_viability ?? dims.market ?? 60,
      team: dims.team_completeness ?? dims.team ?? 60,
      documentation: dims.documentation ?? 60,
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
    budget: api.budget_min ?? 0,
    videoUrl: api.video ?? null,
    repoUrl: api.github_url ?? null,
    createdAt: api.created_at ?? new Date().toISOString(),
  };
}

async function fetchProject(id) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ihyaa_token")?.value;

    const headers = {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(`${API_BASE}/projects/${id}`, { headers, cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function ProjectDetailPage({ params }) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const apiProject = await fetchProject(id);
  if (!apiProject) {
    notFound();
  }

  const project = mapApiToLegacy(apiProject);
  return <ProjectDetail project={project} />;
}
