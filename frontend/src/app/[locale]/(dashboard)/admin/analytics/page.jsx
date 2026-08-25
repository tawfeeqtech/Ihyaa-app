"use client";

/**
 * EPIC-12 · US-061/062/063/064 — Admin analytics dashboard.
 *
 * Data is computed live from the database on every page load (no WebSocket, no
 * pre-aggregation — admin-api.md §0). Charts are SVG via Recharts with an
 * "insufficient data" state when chart_sufficient is false; the interests table
 * always shows all status rows (zeros when empty); the CSV export hits
 * GET /admin/analytics/export with the auth token.
 *
 * Route protection: middleware guards `/admin/*` to the admin role.
 */

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  ChartLineUp,
  DownloadSimple,
  FolderSimple,
  Heart,
  Star,
  UsersThree,
} from "@phosphor-icons/react";
import { Button } from "@/shared/components/Button";
import { Skeleton } from "@/shared/components/Skeleton";
import { useToast } from "@/shared/components/Toast";
import { cn, formatNumber } from "@/shared/utils";
import { downloadAnalyticsCsv, fetchAnalytics } from "@/features/admin";
import { ActiveUsersLine, SectorPie } from "@/features/admin";

export default function AdminAnalyticsPage() {
  const t = useTranslations("admin");
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [analytics, setAnalytics] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchAnalytics();
      setAnalytics(data);
    } catch (err) {
      toast.error(err.body?.message ?? t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    // Async data fetch — setState happens after await, not synchronously.
    load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  async function handleExport() {
    setExporting(true);
    try {
      await downloadAnalyticsCsv();
      toast.success(t("exportSuccess"));
    } catch (err) {
      toast.error(err.body?.message ?? t("exportFailed"));
    } finally {
      setExporting(false);
    }
  }

  const users = analytics?.users ?? {};
  const projects = analytics?.projects ?? {};
  const interests = analytics?.interests ?? {};
  const chartSuff = analytics?.chart_sufficient ?? { sector: false, active_users: false };

  const statItems = [
    { key: "users", value: users.total ?? 0, icon: UsersThree },
    { key: "projects", value: projects.total ?? 0, icon: FolderSimple },
    { key: "avgScore", value: analytics?.avg_ai_score ?? 0, icon: Star },
    { key: "interests", value: interests.total ?? 0, icon: Heart },
  ];

  const interestRows = [
    { status: "pending", count: interests.pending ?? 0 },
    { status: "accepted", count: interests.accepted ?? 0 },
    { status: "rejected", count: interests.rejected ?? 0 },
    { status: "cancelled", count: interests.cancelled ?? 0 },
  ];

  const sectorData = Array.isArray(analytics?.sector_distribution)
    ? analytics.sector_distribution
    : [];
  const activeUsersData = Array.isArray(analytics?.active_users_7d)
    ? analytics.active_users_7d
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-text-secondary">{t("subtitle")}</p>
        </div>
        <Button onClick={handleExport} loading={exporting}>
          <DownloadSimple size={18} weight="bold" aria-hidden />
          {exporting ? t("exporting") : t("exportCsv")}
        </Button>
      </div>

      {loading ? (
        <AnalyticsSkeleton />
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {statItems.map(({ key, value, icon: IconComponent }, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-100">
                  <IconComponent size={20} weight="regular" className="text-primary-600" />
                </span>
                <p className="mt-4 font-heading text-2xl font-bold text-text-primary">
                  {formatNumber(value)}
                </p>
                <p className="mt-0.5 text-sm text-text-secondary">{t(`stats.${key}`)}</p>
              </motion.div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title={t("sector.title")} icon={ChartLineUp}>
              <SectorPie data={sectorData} sufficient={Boolean(chartSuff.sector)} />
            </ChartCard>
            <ChartCard title={t("activeUsers.title")} icon={ChartLineUp}>
              <ActiveUsersLine data={activeUsersData} sufficient={Boolean(chartSuff.active_users)} />
            </ChartCard>
          </div>

          {/* Interests by status — always shows all rows (zeros when empty) */}
          <div className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-heading text-base font-bold text-text-primary">
              <Heart size={20} className="text-primary-600" aria-hidden />
              {t("interestsTable.title")}
            </h2>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b border-border text-start text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    <th className="px-4 py-3 text-start">{t("interestsTable.status")}</th>
                    <th className="px-4 py-3 text-end">{t("interestsTable.count")}</th>
                  </tr>
                </thead>
                <tbody>
                  {interestRows.map((row) => (
                    <tr key={row.status} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3">
                        <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", statusBadge(row.status))}>
                          {t(`interests.status.${row.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-end font-heading font-semibold text-text-primary">
                        {formatNumber(row.count)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-surface-0/60">
                    <td className="px-4 py-3 font-heading font-semibold text-text-primary">
                      {t("interestsTable.total")}
                    </td>
                    <td className="px-4 py-3 text-end font-heading font-bold text-text-primary">
                      {formatNumber(interests.total ?? 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {(interests.total ?? 0) === 0 && (
              <p className="mt-3 text-xs text-text-secondary">{t("interestsTable.emptyNote")}</p>
            )}
          </div>

          {/* Data-freshness note */}
          <p className="text-xs text-text-secondary">
            {analytics?.generated_at
              ? new Date(analytics.generated_at).toLocaleString()
              : null}
          </p>
        </>
      )}
    </div>
  );
}

/** Card shell shared by the two charts. */
function ChartCard({ title, icon: IconComponent, children }) {
  return (
    <div className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-heading text-base font-bold text-text-primary">
        <IconComponent size={20} className="text-primary-600" aria-hidden />
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

/** Status pill classes matching the rest of the app's interest boards. */
function statusBadge(status) {
  switch (status) {
    case "pending":
      return "bg-tint-warning text-warning-ink";
    case "accepted":
      return "bg-tint-success text-success-ink";
    case "rejected":
      return "bg-tint-danger text-danger-ink";
    default:
      return "bg-accent-100 text-primary-600";
  }
}

/** Loading skeleton for the analytics page (cards + charts + table). */
function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="mt-4 h-7 w-16" />
            <Skeleton className="mt-2 h-4 w-24" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-4 h-56 w-full" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm">
        <Skeleton className="h-5 w-48" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
