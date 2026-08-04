"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BookmarkSimple,
  Compass,
  Heart,
  SlidersHorizontal,
  TrendUp,
} from "@phosphor-icons/react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Button } from "@/shared/components/Button";
import { ProjectCard } from "@/features/projects/components/ProjectCard";
import { EmptyState } from "@/shared/components/EmptyState";
import { Skeleton } from "@/shared/components/Skeleton";
import { useToast } from "@/shared/components/Toast";
import { api } from "@/shared/lib/api";
import { cn, formatNumber } from "@/shared/utils";

/** Adapt API project shape to what ProjectCard expects. */
function mapProject(p) {
  return {
    id: p.id,
    title: { ar: p.title, en: p.title },
    description: { ar: p.description ?? "", en: p.description ?? "" },
    sector: p.category?.slug ?? "tech",
    aiScore: p.ai_score ?? 0,
    status: p.status ?? "needs_funding",
    interested: p.interested_count ?? 0,
    views: p.view_count ?? 0,
    budget: p.budget_min ?? 0,
    createdAt: p.created_at ?? new Date().toISOString(),
    owner: { name: p.owner?.name ?? "Unknown" },
  };
}

export default function InvestorDashboardPage() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const format = useFormatter();
  const toast = useToast();

  const [tab, setTab] = useState("discover");
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [savedProjects, setSavedProjects] = useState([]);
  const [sentInterests, setSentInterests] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const [dashData, savedData, interestsData] = await Promise.all([
        api.get("/dashboard/investor"),
        api.get("/saved-projects").catch(() => []),
        api.get("/interests/sent").catch(() => []),
      ]);
      setDashboard(dashData);
      setSavedProjects(savedData.data ?? savedData ?? []);
      setSentInterests(interestsData.data ?? interestsData ?? []);
    } catch (err) {
      toast.error(err.body?.message ?? "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const suggestions = (dashboard?.suggestions?.data ?? dashboard?.suggestions ?? []).map(mapProject);
  const statsData = dashboard?.interest_stats ?? {};

  const stats = [
    { key: "sent", value: statsData.total ?? 0, change: null, icon: Heart },
    { key: "saved", value: dashboard?.saved_count ?? 0, change: null, icon: BookmarkSimple },
  ];

  async function handleSaveToggle(project) {
    try {
      const isSaved = savedProjects.some((sp) => (sp.id ?? sp.project_id) === project.id);
      if (isSaved) {
        await api.delete(`/projects/${project.id}/save`);
        setSavedProjects((prev) => prev.filter((sp) => (sp.id ?? sp.project_id) !== project.id));
        toast.success(t("investor.unsaved"));
      } else {
        await api.post(`/projects/${project.id}/save`);
        setSavedProjects((prev) => [...prev, { project_id: project.id, project: project }]);
        toast.success(t("investor.saved"));
      }
    } catch {
      toast.error(t("investor.saveError"));
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton lines={3} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-surface-1 p-5">
              <Skeleton lines={4} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "discover", label: t("investor.tabs.discover"), icon: Compass },
    { key: "saved", label: t("investor.tabs.saved"), icon: BookmarkSimple },
    { key: "interests", label: t("investor.tabs.interests"), icon: Heart },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t("investor.title")}</h1>
        <p className="mt-1 text-text-secondary">{t("investor.subtitle")}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
            <p className="mt-0.5 text-sm text-text-secondary">{t(`investor.stats.${key}`)}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label={t("investor.tabsLabel")} className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map(({ key, label, icon: IconComponent }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors",
              tab === key
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-text-secondary hover:text-text-primary"
            )}
          >
            <IconComponent size={18} weight={tab === key ? "fill" : "regular"} />
            {label}
          </button>
        ))}
      </div>

      {/* Discover */}
      {tab === "discover" && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {suggestions.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon={Compass}
                title={t("investor.noSuggestions")}
                description={t("investor.noSuggestionsDesc")}
              />
            </div>
          ) : (
            suggestions.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                locale={locale}
                onSave={() => handleSaveToggle(project)}
                isSaved={savedProjects.some((sp) => (sp.id ?? sp.project_id) === project.id)}
              />
            ))
          )}
        </div>
      )}

      {/* Saved */}
      {tab === "saved" && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {savedProjects.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon={BookmarkSimple}
                title={t("investor.noSaved")}
                description={t("investor.noSavedDesc")}
                action={
                  <Button onClick={() => setTab("discover")}>
                    <Compass size={18} />
                    {t("investor.explore")}
                  </Button>
                }
              />
            </div>
          ) : (
            savedProjects.map((sp) => {
              const p = sp.project ?? sp;
              return (
                <ProjectCard
                  key={sp.id ?? sp.project_id}
                  project={mapProject(p)}
                  locale={locale}
                  onSave={() => handleSaveToggle(p)}
                  isSaved
                />
              );
            })
          )}
        </div>
      )}

      {/* Interests sent */}
      {tab === "interests" && (
        <div className="space-y-3">
          {sentInterests.length === 0 ? (
            <EmptyState
              icon={Heart}
              title={t("investor.noInterests")}
              description={t("investor.noInterestsDesc")}
            />
          ) : (
            sentInterests.map((req) => {
              const statusStyle =
                req.status === "pending"
                  ? "bg-tint-warning text-warning-ink"
                  : req.status === "accepted"
                    ? "bg-tint-success text-success-ink"
                    : "bg-accent-100 text-primary-600";
              return (
                <div
                  key={req.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface-1 p-5 shadow-sm"
                >
                  <div>
                    <p className="font-heading font-semibold text-text-primary">
                      {req.project?.title ?? `Project #${req.project_id}`}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {format.dateTime(new Date(req.created_at ?? req.date), { dateStyle: "medium" })}
                    </p>
                  </div>
                  <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", statusStyle)}>
                    {t(`investor.status.${req.status}`)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
