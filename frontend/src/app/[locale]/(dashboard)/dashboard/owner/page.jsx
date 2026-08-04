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
import { cn, formatNumber } from "@/shared/utils";

export default function OwnerDashboardPage() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const format = useFormatter();
  const toast = useToast();

  const [tab, setTab] = useState("projects");
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [interests, setInterests] = useState([]);
  const [trashed, setTrashed] = useState([]);
  const [evaluating, setEvaluating] = useState(null);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashData, interestData, trashData] = await Promise.all([
        api.get("/dashboard/idea-owner"),
        api.get("/interests/received").catch(() => []),
        api.get("/trashed-projects").catch(() => []),
      ]);
      setDashboard(dashData);
      setInterests(interestData.data ?? interestData ?? []);
      setTrashed(trashData.data ?? trashData ?? []);
    } catch (err) {
      setError(err.body?.message ?? "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const myProjects = dashboard?.projects?.data ?? dashboard?.projects ?? [];
  const statsData = dashboard?.stats ?? {};
  const avgScore = statsData.avg_ai_score ?? 0;
  const totalInterested = statsData.interests_total ?? 0;
  const totalViews = statsData.total_views ?? 0;

  const stats = [
    { key: "projects", value: myProjects.length, change: null, icon: FolderPlus },
    { key: "avgScore", value: Math.round(avgScore), change: null, icon: Star },
    { key: "interested", value: totalInterested, change: null, icon: Heart },
    { key: "views", value: totalViews, change: null, icon: Eye },
  ];

  async function handleReevaluate(projectId) {
    setEvaluating(projectId);
    try {
      await api.post(`/projects/${projectId}/evaluate`);
      toast.success(t("owner.reevalQueued"));
    } catch {
      toast.error(t("owner.reevalError"));
    } finally {
      setEvaluating(null);
    }
  }

  async function handleDelete(projectId) {
    try {
      await api.delete(`/projects/${projectId}`);
      setDashboard((prev) => ({
        ...prev,
        projects: (prev?.projects?.data ?? prev?.projects ?? []).filter((p) => p.id !== projectId),
      }));
      toast.warning(t("owner.deleted"), t("owner.trashHint"));
    } catch {
      toast.error(t("owner.deleteError"));
    }
  }

  async function handleRestore(projectId) {
    try {
      await api.post(`/trashed-projects/${projectId}/restore`);
      setTrashed((prev) => prev.filter((p) => p.id !== projectId));
      toast.success(t("owner.restored"));
      fetchDashboard();
    } catch {
      toast.error(t("owner.restoreError"));
    }
  }

  async function handleInterestAction(id, action) {
    try {
      if (action === "accept") {
        await api.put(`/interests/${id}/accept`);
      } else {
        await api.put(`/interests/${id}/reject`);
      }
      setInterests((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, status: action === "accept" ? "agreed" : "rejected" } : i
        )
      );
      toast.success(action === "accept" ? t("owner.accepted") : t("owner.declined"));
    } catch {
      toast.error(t("owner.actionError"));
    }
  }

  const tabs = [
    { key: "projects", label: t("owner.tabs.projects") },
    { key: "interests", label: t("owner.tabs.interests") },
    { key: "trash", label: t("owner.tabs.trash") },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton lines={3} />
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-surface-1 p-5">
              <Skeleton lines={3} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={Trash}
        title={t("owner.errorTitle")}
        description={error}
        action={<Button onClick={fetchDashboard}>{t("owner.retry")}</Button>}
      />
    );
  }

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

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map(({ key, value, change, icon: IconComponent }, i) => (
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
              {change && (
                <span className="flex items-center gap-1 text-xs font-semibold text-success">
                  <TrendUp size={14} weight="bold" aria-hidden />
                  {change}
                </span>
              )}
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
      {tab === "projects" && (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface-1 shadow-sm">
          {myProjects.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={FolderPlus}
                title={t("owner.noProjects")}
                description={t("owner.noProjectsDesc")}
                action={
                  <Link href="/projects/new">
                    <Button>{t("owner.newProject")}</Button>
                  </Link>
                }
              />
            </div>
          ) : (
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-start text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  <th className="px-5 py-3.5 text-start">{t("owner.table.title")}</th>
                  <th className="px-5 py-3.5 text-start">{t("owner.table.score")}</th>
                  <th className="px-5 py-3.5 text-start">{t("owner.table.status")}</th>
                  <th className="px-5 py-3.5 text-end">{t("owner.table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {myProjects.map((p) => (
                  <tr key={p.id} className="border-b border-border/60 last:border-0 hover:bg-surface-0/60">
                    <td className="px-5 py-4">
                      <Link href={`/projects/${p.id}`} className="font-heading font-semibold text-text-primary hover:text-primary-600">
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <AIScoreBadge score={p.ai_score ?? 0} showLabel={false} />
                    </td>
                    <td className="px-5 py-4 text-text-secondary">
                      {p.status ?? "draft"}
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
          )}
        </div>
      )}

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
              const statusStyle =
                req.status === "pending"
                  ? "bg-tint-warning text-warning-ink"
                  : req.status === "accepted" || req.status === "agreed"
                    ? "bg-tint-success text-success-ink"
                    : "bg-accent-100 text-primary-600";
              return (
                <div
                  key={req.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-surface-1 p-5 shadow-sm sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-600 font-heading text-sm font-bold text-white">
                      {(req.investor?.name ?? req.investor_name ?? "?").trim().charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-heading font-semibold text-text-primary">
                        {req.investor?.name ?? req.investor_name ?? t("owner.unknownInvestor")}
                      </p>
                      <p className="truncate text-sm text-text-secondary">
                        {req.project?.title ?? `Project #${req.project_id}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", statusStyle)}>
                      {t(`owner.requestStatus.${req.status}`)}
                    </span>
                    {req.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleInterestAction(req.id, "accept")}>
                          {t("owner.accept")}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleInterestAction(req.id, "reject")}>
                          {t("owner.decline")}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ===== Trash ===== */}
      {tab === "trash" && (
        <div className="space-y-3">
          <p className="rounded-lg bg-tint-warning px-4 py-3 text-sm text-warning-ink">
            {t("owner.trashNote")}
          </p>
          {trashed.length === 0 ? (
            <EmptyState icon={Trash} title={t("owner.trashEmpty")} />
          ) : (
            trashed.map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-surface-1 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-0 text-text-secondary">
                    <Trash size={20} aria-hidden />
                  </span>
                  <p className="font-heading font-semibold text-text-primary">{p.title}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => handleRestore(p.id)}>
                    <ArrowCounterClockwise size={16} />
                    {t("owner.restore")}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
