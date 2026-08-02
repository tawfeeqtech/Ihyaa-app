"use client";

import { useState } from "react";
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
import { Link } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { AIScoreBadge } from "@/components/ui/AIScoreBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { projects, statusLabels } from "@/lib/mock-data";
import { cn, formatNumber } from "@/lib/utils";

type OwnerTab = "projects" | "interests" | "trash";

interface InterestRequest {
  id: number;
  investor: string;
  company: string;
  projectId: string;
  date: string;
  status: "new" | "contacted" | "agreed";
}

const mockInterests: InterestRequest[] = [
  { id: 1, investor: "أحمد السالم", company: "AlSalam Ventures", projectId: "p1", date: "2026-07-28", status: "new" },
  { id: 2, investor: "Layla Haddad", company: "MENA Angels", projectId: "p1", date: "2026-07-25", status: "contacted" },
  { id: 3, investor: "Omar Farouk", company: "TechBridge", projectId: "p8", date: "2026-07-20", status: "agreed" },
];

export default function OwnerDashboardPage() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const format = useFormatter();
  const toast = useToast();

  const [tab, setTab] = useState<OwnerTab>("projects");
  const [interests, setInterests] = useState(mockInterests);
  const [deleted, setDeleted] = useState<string[]>(["p6"]);
  const [evaluating, setEvaluating] = useState<string | null>(null);

  const myProjects = projects.filter((p) => p.id !== "p6");
  const avgScore = Math.round(myProjects.reduce((sum, p) => sum + p.aiScore, 0) / myProjects.length);
  const totalInterested = myProjects.reduce((sum, p) => sum + p.interested, 0);
  const totalViews = myProjects.reduce((sum, p) => sum + p.views, 0);

  const stats = [
    { key: "projects", value: myProjects.length, change: "+2", icon: FolderPlus },
    { key: "avgScore", value: avgScore, change: "+6%", icon: Star },
    { key: "interested", value: totalInterested, change: "+12%", icon: Heart },
    { key: "views", value: totalViews, change: "+8%", icon: Eye },
  ] as const;

  function handleReevaluate(projectId: string) {
    setEvaluating(projectId);
    // Simulate queued AI re-evaluation (backend: Laravel Queue, < 120s P95).
    window.setTimeout(() => {
      setEvaluating(null);
      toast.success(t("owner.reevalQueued"));
    }, 1400);
  }

  function handleDelete(projectId: string) {
    setDeleted((d) => [...d, projectId]);
    toast.warning(t("owner.deleted"), t("owner.trashHint"));
  }

  function handleRestore(projectId: string) {
    setDeleted((d) => d.filter((id) => id !== projectId));
    toast.success(t("owner.restored"));
  }

  function handleInterestAction(id: number, action: "accept" | "decline") {
    setInterests((prev) => prev.map((i) => (i.id === id ? { ...i, status: action === "accept" ? "agreed" : "contacted" } : i)));
    toast.success(action === "accept" ? t("owner.accepted") : t("owner.declined"));
  }

  const tabs: { key: OwnerTab; label: string }[] = [
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
      {tab === "projects" && (
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
                    {locale === "ar" ? statusLabels[p.status].ar : statusLabels[p.status].en}
                  </td>
                  <td className="px-5 py-4 font-medium text-text-primary">{p.interested}</td>
                  <td className="px-5 py-4 text-text-secondary">
                    {format.dateTime(new Date(p.createdAt), { dateStyle: "medium" })}
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
              const project = projects.find((p) => p.id === req.projectId);
              const statusStyle =
                req.status === "new"
                  ? "bg-tint-warning text-warning-ink"
                  : req.status === "agreed"
                    ? "bg-tint-success text-success-ink"
                    : "bg-accent-100 text-primary-600";
              return (
                <div
                  key={req.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-surface-1 p-5 shadow-sm sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-600 font-heading text-sm font-bold text-white">
                      {req.investor.trim().charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-heading font-semibold text-text-primary">{req.investor}</p>
                      <p className="truncate text-sm text-text-secondary">
                        {req.company} · {project ? (locale === "ar" ? project.title.ar : project.title.en) : "—"}
                      </p>
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
                        disabled={req.status === "agreed"}
                      >
                        {t("owner.accept")}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleInterestAction(req.id, "decline")}
                        disabled={req.status === "agreed"}
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
          {deleted.length === 0 ? (
            <EmptyState icon={Trash} title={t("owner.trashEmpty")} />
          ) : (
            deleted.map((id) => {
              const p = projects.find((x) => x.id === id);
              if (!p) return null;
              return (
                <div
                  key={id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-surface-1 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-0 text-text-secondary">
                      <Trash size={20} aria-hidden />
                    </span>
                    <p className="font-heading font-semibold text-text-primary">
                      {locale === "ar" ? p.title.ar : p.title.en}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => handleRestore(id)}>
                      <ArrowCounterClockwise size={16} />
                      {t("owner.restore")}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleted((d) => d.filter((x) => x !== id))}>
                      <Trash size={16} />
                      {t("owner.deleteForever")}
                    </Button>
                  </div>
                </div>
              );
            })
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
    </div>
  );
}
