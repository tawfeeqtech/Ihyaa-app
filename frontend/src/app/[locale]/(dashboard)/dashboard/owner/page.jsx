import { setRequestLocale, getTranslations } from "next-intl/server";
import { fetchOwnerDashboard } from "@/features/dashboard/lib/dashboard";
import { QuickActions } from "@/features/dashboard/components/quick-actions";
import { KpiGrid } from "@/features/dashboard/components/kpi-grid";
import { ProjectMiniCardGrid } from "@/features/dashboard/components/project-mini-card-grid";
import { EventsFeed } from "@/features/dashboard/components/events-feed";

/**
 * EPIC-10 · Idea-owner dashboard (US-051..053 · T053) — dashboard-api.md §1.
 *
 * Server Component. Reads the aggregate `{ kpis, projects, feed }` from
 * GET /api/dashboard/idea-owner with `cache: "no-store"` (the dashboard is
 * computed per load — SRS-F10-01..03), then renders the client widgets:
 *   - QuickActions (US-054 · T067/068)  — 3 primary destinations.
 *   - KpiGrid (US-052 · T058/059)       — 4 KPIs.
 *   - ProjectMiniCardGrid (US-051)      — the 4-state AI cards (الدستور II);
 *                                        zero projects → EmptyState primary CTA.
 *   - EventsFeed (US-053 · T063)        — last 10 events + «عرض كل الأحداث».
 *
 * The widgets are client components (Phosphor icons are client-only here) and
 * carry their own translations; only serializable data crosses the boundary.
 * No Phosphor icon is imported into this server module.
 */
export default async function OwnerDashboardPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");

  const data = await fetchOwnerDashboard();
  const kpis = data?.kpis ?? {};
  const projects = Array.isArray(data?.projects) ? data.projects : [];
  const feed = data?.feed ?? { items: [], has_more: false };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t("owner.title")}</h1>
        <p className="mt-1 text-text-secondary">{t("owner.subtitle")}</p>
      </div>

      <QuickActions />

      <KpiGrid kpis={kpis} />

      {/* Projects (4-state AI cards) */}
      <section aria-label={t("owner.projectsLabel")}>
        <ProjectMiniCardGrid projects={projects} />
      </section>

      {/* Events feed (last 10) */}
      <EventsFeed items={feed.items ?? []} hasMore={feed.has_more === true} />
    </div>
  );
}
