"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowCounterClockwise,
  ChartLineUp,
  Eye,
  FolderPlus,
  Heart,
  PencilSimple,
  Plus,
  Star,
  Trash,
  TrendUp,
} from "@phosphor-icons/react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Link } from "@/config/i18n/link";
import { Button } from "@/shared/components/Button";
import { AIScoreBadge } from "@/features/projects/components/AIScoreBadge";
import { EmptyState } from "@/shared/components/EmptyState";
import { Skeleton } from "@/shared/components/Skeleton";
import { useToast } from "@/shared/components/Toast";
import { api } from "@/shared/lib/api";
import { mapApiProject, statusLabels } from "@/features/projects/data/projects";
import { cn, formatNumber } from "@/shared/utils";

export default function OwnerDashboardPage() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const format = useFormatter();
  const toast = useToast();

  const [tab, setTab] = useState("projects");
  const [loading, setLoading] = useState(true);
  const [myProjects, setMyProjects] = useState([]);
  const [interests, setInterests] = useState([]);
  const [trashProjects, setTrashProjects] = useState([]);
  const [evaluating, setEvaluating] = useState(null);
  const [stats, setStats] = useState({ projects: 0, avgScore: 0, interested: 0, views: 0 });

  const load = useCallback(async () => {
    try {
      const dashRes = await api.get("/dashboard/idea-owner");
      const d = dashRes?.data ?? dashRes ?? {};

      // Project list: the dashboard contract exposes `projects`, but the current
      // backend returns aggregate counts only — fall back to the published
      // gallery so the "My projects" table has real rows.
      let list = Array.isArray(d.projects) ? d.projects : null;
      if (!list) {
        const gal = await api.get("/projects?per_page=50");
        list = gal?.data ?? [];
      }

      const mapped = (list ?? []).map(mapApiProject);
      setMyProjects(mapped);

      // Interests + trash are secondary — keep the page usable if one fails.
      const [interestsRes, trashRes] = await Promise.allSettled([
        api.get("/interests/received?per_page=20"),
        api.get("/trashed-projects?per_page=20"),
      ]);
      setInterests(interestsRes.status === "fulfilled" ? (interestsRes.value?.data ?? []) : []);
      setTrashProjects(
        (trashRes.status === "fulfilled" ? (trashRes.value?.data ?? []) : []).map((tr) => ({
          ...mapApiProject(tr),
          deletedAt: tr.deleted_at,
          daysLeft: tr.days_left,
        }))
      );

      setStats({
        projects: d.project_stats?.total ?? mapped.length,
        avgScore: mapped.length
          ? Math.round(mapped.reduce((sum, p) => sum + p.aiScore, 0) / mapped.length)
          : 0,
        interested: d.interest_stats?.total ?? 0,
        views: mapped.reduce((sum, p) => sum + p.views, 0),
      });
    } catch (err) {
      toast.error(err.body?.message ?? t("owner.title"));
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    // Async data fetch — setState happens after await, not synchronously.
    load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  async function handleReevaluate(projectId) {
    setEvaluating(projectId);
    try {
      await api.post(`/projects/${projectId}/evaluate`, {});
      toast.success(t("owner.reevalQueued"));
    } catch (err) {
      toast.error(err.body?.message ?? t("owner.reevalQueued"));
    } finally {
      setEvaluating(null);
    }
  }

  async function handleDelete(projectId) {
    try {
      await api.delete(`/projects/${projectId}`);
      const removed = myProjects.find((p) => p.id === String(projectId));
      setMyProjects((prev) => prev.filter((p) => p.id !== String(projectId)));
      if (removed) {
        setTrashProjects((prev) => [
          { ...removed, deletedAt: new Date().toISOString(), daysLeft: 30 },
          ...prev,
        ]);
      }
      toast.warning(t("owner.deleted"), t("owner.trashHint"));
    } catch (err) {
      toast.error(err.body?.message ?? t("owner.deleted"));
    }
  }

  async function handleRestore(projectId) {
    try {
      await api.post(`/trashed-projects/${projectId}/restore`);
      setTrashProjects((prev) => prev.filter((p) => p.id !== String(projectId)));
      toast.success(t("owner.restored"));
    } catch (err) {
      toast.error(err.body?.message ?? t("owner.restored"));
    }
  }

  async function handleDeleteForever(projectId) {
    try {
      await api.delete(`/trashed-projects/${projectId}/force`);
      setTrashProjects((prev) => prev.filter((p) => p.id !== String(projectId)));
    } catch (err) {
      toast.error(err.body?.message ?? t("owner.deleteForever"));
    }
  }

  async function handleInterestAction(id, action) {
    const path = action === "accept" ? "accept" : "reject";
    try {
      await api.put(`/interests/${id}/${path}`, {});
      setInterests((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, status: action === "accept" ? "accepted" : "rejected" } : i
        )
      );
      toast.success(action === "accept" ? t("owner.accepted") : t("owner.declined"));
    } catch (err) {
      toast.error(err.body?.message ?? (action === "accept" ? t("owner.accepted") : t("owner.declined")));
    }
  }

  const statItems = [
    { key: "projects", value: stats.projects, change: "+2", icon: FolderPlus },
    { key: "avgScore", value: stats.avgScore, change: "+6%", icon: Star },
    { key: "interested", value: stats.interested, change: "+12%", icon: Heart },
    { key: "views", value: stats.views, change: "+8%", icon: Eye },
  ];

  const tabs = [
    { key: "projects", label: t("owner.tabs.projects") },
    { key: "interests", label: t("owner.tabs.interests") },
    { key: "trash", label: t("owner.tabs.trash") },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t("owner.title")}</h1>
          <p className="mt-1 text-text-secondary">{t("owner.subtitle")}</p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus size={18} weight="bold" />
            {t("owner.newProject")}
          </Button>
        </Link>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {statItems.map(({ key, value, change, icon: IconComponent }, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-100">
                    <IconComponent size={20} weight="regular" className="text-primary-600" />
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-success">
                    <TrendUp size={14} weight="bold" aria-hidden />
                    {change}
                  </span>
                </div>
                <p className="mt-4 font-heading text-2xl font-bold text-text-primary">
                  {formatNumber(value)}
                </p>
                <p className="mt-0.5 text-sm text-text-secondary">{t(`owner.stats.${key}`)}</p>
              </motion.div>
            ))}
          </div>

          {/* Tabs */}
          <div role="tablist" aria-label={t("owner.tabsLabel")} className="flex gap-1 overflow-x-auto border-b border-border">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={cn(
                  "min-h-12 shrink-0 border-b-2 px-4 text-sm font-semibold transition-colors",
                  tab === key
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ===== My projects ===== */}
          {tab === "projects" &&
            (myProjects.length === 0 ? (
              <EmptyState
                icon={FolderPlus}
                title={t("owner.projectsEmpty")}
                description={t("owner.projectsEmptyDesc")}
                action={
                  <Link href="/projects/new">
                    <Button>{t("owner.newProject")}</Button>
                  </Link>
                }
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border bg-surface-1 shadow-sm">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-start text-xs font-semibold uppercase tracking-wide text-text-secondary">
                      <th className="px-5 py-3.5 text-start">{t("owner.table.title")}</th>
                      <th className="px-5 py-3.5 text-start">{t("owner.table.score")}</th>
                      <th className="px-5 py-3.5 text-start">{t("owner.table.status")}</th>
                      <th className="px-5 py-3.5 text-start">{t("owner.table.interested")}</th>
                      <th className="px-5 py-3.5 text-start">{t("owner.table.updated")}</th>
                      <th className="px-5 py-3.5 text-end">{t("owner.table.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myProjects.map((p) => (
                      <tr key={p.id} className="border-b border-border/60 last:border-0 hover:bg-surface-0/60">
                        <td className="px-5 py-4">
                          <Link href={`/projects/${p.id}`} className="font-heading font-semibold text-text-primary hover:text-primary-600">
                            {locale === "ar" ? p.title.ar : p.title.en}
                          </Link>
                        </td>
                        <td className="px-5 py-4">
                          <AIScoreBadge score={p.aiScore} showLabel={false} />
                        </td>
                        <td className="px-5 py-4 text-text-secondary">
                          {locale === "ar" ? statusLabels[p.status]?.ar : statusLabels[p.status]?.en}
                        </td>
                        <td className="px-5 py-4 font-medium text-text-primary">{p.interested}</td>
                        <td className="px-5 py-4 text-text-secondary">
                          {p.createdAt
                            ? format.dateTime(new Date(p.createdAt), { dateStyle: "medium" })
                            : "—"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/projects/${p.id}`}>
                              <button type="button" className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-accent-100 hover:text-primary-600" aria-label={t("owner.view")}>
                                <Eye size={18} />
                              </button>
                            </Link>
                            <button
                              type="button"
                              onClick={() => toast.info(t("owner.editSoon"))}
                              className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-accent-100 hover:text-primary-600"
                              aria-label={t("owner.edit")}
                            >
                              <PencilSimple size={18} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReevaluate(p.id)}
                              disabled={evaluating === p.id}
                              className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-accent-100 hover:text-primary-600 disabled:opacity-50"
                              aria-label={t("owner.reevaluate")}
                              title={t("owner.reevaluate")}
                            >
                              <ArrowCounterClockwise size={18} className={cn(evaluating === p.id && "animate-spin")} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(p.id)}
                              className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-tint-danger hover:text-danger"
                              aria-label={t("owner.delete")}
                            >
                              <Trash size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {/* ===== Interests ===== */}
          {tab === "interests" && (
            <div className="space-y-3">
              {interests.length === 0 ? (
                <EmptyState
                  icon={Heart}
                  title={t("owner.interestsEmpty")}
                  description={t("owner.interestsEmptyDesc")}
                />
              ) : (
                interests.map((req) => {
                  const project = myProjects.find((p) => p.id === String(req.project_id));
                  const investorName = req.investor?.name ?? "—";
                  const projectTitle = project
                    ? locale === "ar"
                      ? project.title.ar
                      : project.title.en
                    : "—";
                  const statusStyle =
                    req.status === "pending"
                      ? "bg-tint-warning text-warning-ink"
                      : req.status === "accepted"
                        ? "bg-tint-success text-success-ink"
                        : req.status === "rejected"
                          ? "bg-tint-danger text-danger-ink"
                          : "bg-accent-100 text-primary-600";
                  return (
                    <div
                      key={req.id}
                      className="flex flex-col gap-3 rounded-xl border border-border bg-surface-1 p-5 shadow-sm sm:flex-row sm:items-center"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-600 font-heading text-sm font-bold text-white">
                          {investorName.trim().charAt(0)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-heading font-semibold text-text-primary">{investorName}</p>
                          <p className="truncate text-sm text-text-secondary">{projectTitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", statusStyle)}>
                          {t(`owner.requestStatus.${req.status}`)}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleInterestAction(req.id, "accept")}
                            disabled={req.status !== "pending"}
                          >
                            {t("owner.accept")}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleInterestAction(req.id, "decline")}
                            disabled={req.status !== "pending"}
                          >
                            {t("owner.decline")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ===== Trash (30-day recovery) ===== */}
          {tab === "trash" && (
            <div className="space-y-3">
              <p className="rounded-lg bg-tint-warning px-4 py-3 text-sm text-warning-ink">
                {t("owner.trashNote")}
              </p>
              {trashProjects.length === 0 ? (
                <EmptyState icon={Trash} title={t("owner.trashEmpty")} />
              ) : (
                trashProjects.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-surface-1 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-0 text-text-secondary">
                        <Trash size={20} aria-hidden />
                      </span>
                      <div>
                        <p className="font-heading font-semibold text-text-primary">
                          {locale === "ar" ? p.title.ar : p.title.en}
                        </p>
                        {typeof p.daysLeft === "number" && (
                          <p className="text-xs text-text-secondary">
                            {t("owner.daysLeft", { count: p.daysLeft })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => handleRestore(p.id)}>
                        <ArrowCounterClockwise size={16} />
                        {t("owner.restore")}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDeleteForever(p.id)}>
                        <Trash size={16} />
                        {t("owner.deleteForever")}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ===== Quick stats strip ===== */}
          <div className="rounded-xl border border-border bg-surface-1 p-5">
            <h2 className="flex items-center gap-2 font-heading text-base font-bold text-text-primary">
              <ChartLineUp size={20} className="text-primary-600" aria-hidden />
              {t("owner.insights")}
            </h2>
            <div className="mt-4 flex h-32 items-end gap-2" aria-hidden>
              {myProjects.map((p) => (
                <div key={p.id} className="group relative flex-1">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-primary-600 to-primary-500 transition-all group-hover:opacity-80"
                    style={{ height: `${p.aiScore}%`, minHeight: 12 }}
                  />
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-text-secondary">{t("owner.insightsNote")}</p>
          </div>
        </>
      )}
    </div>
  );
}

/** Loading skeleton for the owner dashboard (stats + table). */
function DashboardSkeleton() {
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
      <div className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm">
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
