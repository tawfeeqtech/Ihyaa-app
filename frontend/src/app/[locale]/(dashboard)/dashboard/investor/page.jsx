"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  BookmarkSimple,
  CheckCircle,
  Compass,
  DownloadSimple,
  Heart,
  SlidersHorizontal,
  TrendUp,
} from "@phosphor-icons/react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Button } from "@/shared/components/Button";
import { ProjectCard } from "@/features/projects/components/ProjectCard";
import { EmptyState } from "@/shared/components/EmptyState";
import { useToast } from "@/shared/components/Toast";
import { projects, sectorOptions, sectorLabels } from "@/features/projects/data/projects";
import { cn, formatNumber } from "@/shared/utils";

const initialInterests = [
  { id: 1, projectId: "p1", date: "2026-07-29", status: "pending" },
  { id: 2, projectId: "p4", date: "2026-07-22", status: "accepted" },
  { id: 3, projectId: "p7", date: "2026-07-10", status: "rejected" },
];

export default function InvestorDashboardPage() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const format = useFormatter();
  const toast = useToast();

  const [tab, setTab] = useState("discover");
  const [saved, setSaved] = useState(["p1", "p4", "p8"]);
  const [interests] = useState(initialInterests);
  const [sectorFilter, setSectorFilter] = useState("all");
  const [prefSectors, setPrefSectors] = useState(["ai_ml", "fintech"]);

  const discoverList = projects.filter((p) => sectorFilter === "all" || p.sector === sectorFilter);
  const acceptedCount = interests.filter((i) => i.status === "accepted").length;
  const pendingCount = interests.filter((i) => i.status === "pending").length;

  const stats = [
    { key: "saved", value: saved.length, icon: BookmarkSimple },
    { key: "interestsSent", value: interests.length, icon: Heart },
    { key: "accepted", value: acceptedCount, icon: CheckCircle },
    { key: "pending", value: pendingCount, icon: Compass },
  ];

  function toggleSaved(projectId) {
    setSaved((prev) => {
      const isSaved = prev.includes(projectId);
      toast.success(isSaved ? t("investor.unsaved") : t("investor.saved"));
      return isSaved ? prev.filter((id) => id !== projectId) : [...prev, projectId];
    });
  }

  function togglePrefSector(sector) {
    setPrefSectors((prev) =>
      prev.includes(sector) ? prev.filter((s) => s !== sector) : [...prev, sector]
    );
  }

  const tabs = [
    { key: "discover", label: t("investor.tabs.discover") },
    { key: "saved", label: t("investor.tabs.saved") },
    { key: "interests", label: t("investor.tabs.interests") },
    { key: "preferences", label: t("investor.tabs.preferences") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t("investor.title")}</h1>
        <p className="mt-1 text-text-secondary">{t("investor.subtitle")}</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map(({ key, value, icon: IconComponent }, i) => (
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
            <p className="mt-0.5 text-sm text-text-secondary">{t(`investor.stats.${key}`)}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label={t("investor.tabsLabel")} className="flex gap-1 overflow-x-auto border-b border-border">
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

      {/* ===== Discover ===== */}
      {tab === "discover" && (
        <div className="space-y-5">
          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t("investor.discoverFilters")}>
            <FilterPill active={sectorFilter === "all"} onClick={() => setSectorFilter("all")}>
              {t("investor.all")}
            </FilterPill>
            {sectorOptions.map((s) => (
              <FilterPill key={s} active={sectorFilter === s} onClick={() => setSectorFilter(s)}>
                {locale === "ar" ? sectorLabels[s].ar : sectorLabels[s].en}
              </FilterPill>
            ))}
          </div>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {discoverList.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                noBookmark
              />
            ))}
          </div>
        </div>
      )}

      {/* ===== Saved ===== */}
      {tab === "saved" && (
        saved.length === 0 ? (
          <EmptyState
            icon={BookmarkSimple}
            title={t("investor.savedEmpty")}
            description={t("investor.savedEmptyDesc")}
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {saved.map((id) => {
              const project = projects.find((p) => p.id === id);
              return project ? (
                <div key={id} className="space-y-3">
                  <ProjectCard project={project} noBookmark />
                  <Button fullWidth variant="secondary" size="sm" onClick={() => toggleSaved(id)}>
                    <BookmarkSimple size={16} weight="fill" className="text-primary-600" />
                    {t("investor.removeSaved")}
                  </Button>
                </div>
              ) : null;
            })}
          </div>
        )
      )}

      {/* ===== My interests ===== */}
      {tab === "interests" && (
        <div className="space-y-3">
          {interests.length === 0 ? (
            <EmptyState icon={Heart} title={t("investor.interestsEmpty")} />
          ) : (
            interests.map((row) => {
              const project = projects.find((p) => p.id === row.projectId);
              const statusStyle =
                row.status === "accepted"
                  ? "bg-tint-success text-success-ink"
                  : row.status === "rejected"
                    ? "bg-tint-danger text-danger-ink"
                    : "bg-tint-warning text-warning-ink";
              return (
                <div
                  key={row.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-surface-1 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-heading font-semibold text-text-primary">
                      {project ? (locale === "ar" ? project.title.ar : project.title.en) : "—"}
                    </p>
                    <p className="mt-0.5 text-sm text-text-secondary">
                      {format.dateTime(new Date(row.date), { dateStyle: "medium" })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", statusStyle)}>
                      {t(`investor.interestStatus.${row.status}`)}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={row.status !== "accepted"}
                      onClick={() => toast.info(t("investor.agreementSoon"))}
                    >
                      <DownloadSimple size={16} />
                      {t("investor.agreement")}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ===== Preferences ===== */}
      {tab === "preferences" && (
        <div className="max-w-2xl space-y-6 rounded-xl border border-border bg-surface-1 p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-text-primary">
            <SlidersHorizontal size={20} className="text-primary-600" aria-hidden />
            {t("investor.preferencesTitle")}
          </h2>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-text-primary">
              {t("investor.prefSectors")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {sectorOptions.map((s) => {
                const selected = prefSectors.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => togglePrefSector(s)}
                    className={cn(
                      "min-h-10 rounded-full border px-3.5 text-sm font-medium transition-all",
                      selected
                        ? "border-primary-600 bg-primary-600 text-white shadow-sm"
                        : "border-border bg-surface-0 text-text-secondary hover:border-primary-500 hover:text-text-primary"
                    )}
                  >
                    {locale === "ar" ? sectorLabels[s].ar : sectorLabels[s].en}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div>
            <label htmlFor="pref-budget" className="mb-1.5 block text-sm font-medium text-text-primary">
              {t("investor.prefBudget")}
            </label>
            <select
              id="pref-budget"
              defaultValue="100k-500k"
              className="w-full rounded-lg border border-border bg-surface-0 px-4 py-3 text-text-primary focus:border-primary-600 focus:outline-none"
            >
              <option value="<100k">&lt; $100K</option>
              <option value="100k-500k">$100K – $500K</option>
              <option value="500k-1m">$500K – $1M</option>
              <option value=">1m">&gt; $1M</option>
            </select>
          </div>

          <Button onClick={() => toast.success(t("investor.prefSaved"))}>
            <TrendUp size={18} weight="bold" />
            {t("investor.savePrefs")}
          </Button>
          <p className="text-xs text-text-secondary">{t("investor.prefsNote")}</p>
        </div>
      )}
    </div>
  );
}

function FilterPill({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-4 py-2.5 text-sm font-medium transition-all duration-300",
        active
          ? "border-primary-600 bg-primary-600 text-white shadow-md"
          : "border-border bg-surface-1 text-text-secondary hover:border-primary-500 hover:text-text-primary"
      )}
    >
      {children}
    </button>
  );
}
