"use client";

import { useState } from "react";
import { FunnelSimple } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/shared/components/Button";
import { sectorLabels, sectorOptions } from "@/features/projects/data/projects";
import { cn } from "@/shared/utils";

/**
 * Multi-filter panel — US-032 (T124).
 *
 * Reads `params` from the URL state and commits changes through `setParams`
 * (which re-writes the permalink + resets to page 1). Facet counts come from
 * the latest search response `data.facets` and appear next to each option
 * (FR-243) — e.g. "التقنية الصحية (42)".
 *
 * Score inputs clamp to [0,100]; toggling a sector/tag/status flips membership
 * in the array/value. `clearFilters` resets everything except the query.
 */
export function FilterPanel({ params, setParams, facets, clearFilters, className }) {
  const t = useTranslations("search");
  const locale = useLocale();
  const [scoreOpen, setScoreOpen] = useState(false);

  const sectorCounts = facets?.sector ?? {};
  const statusCounts = facets?.status ?? {};
  const tagCounts = facets?.tags ?? {};

  const toggleTag = (tag) => {
    const has = params.tags.includes(tag);
    setParams({ tags: has ? params.tags.filter((x) => x !== tag) : [...params.tags, tag] });
  };

  const setScore = (key) => (e) => {
    const raw = e.target.value;
    // Clamp to 0–100, allow empty while typing.
    if (raw === "") return setParams({ [key]: "" });
    const n = Number(raw);
    if (Number.isNaN(n)) return;
    setParams({ [key]: String(Math.max(0, Math.min(100, Math.round(n)))) });
  };

  return (
    <aside
      aria-label={t("filters.title")}
      className={cn(
        "flex flex-col gap-6 rounded-xl border border-border bg-surface-1 p-5 lg:sticky lg:top-24",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
          <FunnelSimple size={18} className="text-primary-600" aria-hidden />
          {t("filters.title")}
        </h2>
      </div>

      {/* Sector */}
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-text-secondary">
          {t("filters.sector")}
        </legend>
        <div className="grid grid-cols-1 gap-1.5">
          {sectorOptions.map((slug) => {
            const count = sectorCounts[slug] ?? 0;
            const active = params.sector === slug;
            return (
              <button
                key={slug}
                type="button"
                role="checkbox"
                aria-checked={active}
                onClick={() => setParams({ sector: active ? "" : slug })}
                className={cn(
                  "flex min-h-11 items-center justify-between gap-2 rounded-lg px-3 text-sm transition-colors",
                  active
                    ? "bg-accent-100 text-primary-600 font-medium"
                    : "text-text-secondary hover:bg-surface-0 hover:text-text-primary"
                )}
              >
                <span className="truncate">
                  {locale === "ar" ? sectorLabels[slug]?.ar : sectorLabels[slug]?.en}
                </span>
                {count > 0 && (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-xs tabular-nums",
                      active ? "bg-primary-600/10 text-primary-600" : "bg-accent-100 text-text-secondary"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Score range */}
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-text-secondary">
          {t("filters.score")}
        </legend>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="score-min">
            {t("filters.minScore")}
          </label>
          <input
            id="score-min"
            type="number"
            inputMode="numeric"
            min="0"
            max="100"
            placeholder={t("filters.minScore")}
            value={params.score_min}
            onChange={setScore("score_min")}
            onFocus={() => setScoreOpen(true)}
            className="h-11 w-full rounded-lg border border-border bg-surface-0 px-3 text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-primary-600 focus:outline-none"
          />
          <span aria-hidden className="text-text-secondary">
            –
          </span>
          <label className="sr-only" htmlFor="score-max">
            {t("filters.maxScore")}
          </label>
          <input
            id="score-max"
            type="number"
            inputMode="numeric"
            min="0"
            max="100"
            placeholder={t("filters.maxScore")}
            value={params.score_max}
            onChange={setScore("score_max")}
            onFocus={() => setScoreOpen(true)}
            className="h-11 w-full rounded-lg border border-border bg-surface-0 px-3 text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-primary-600 focus:outline-none"
          />
        </div>
        {scoreOpen && (
          <p className="mt-1.5 text-xs text-text-secondary">
            0–100
          </p>
        )}
      </fieldset>

      {/* Status */}
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-text-secondary">
          {t("filters.status")}
        </legend>
        <div className="flex flex-col gap-1.5">
          {["completed", "needs_development", "needs_funding"].map((status) => {
            const active = params.status === status;
            const count = statusCounts[status] ?? 0;
            return (
              <button
                key={status}
                type="button"
                role="checkbox"
                aria-checked={active}
                onClick={() => setParams({ status: active ? "" : status })}
                className={cn(
                  "flex min-h-11 items-center justify-between gap-2 rounded-lg px-3 text-sm transition-colors",
                  active
                    ? "bg-accent-100 text-primary-600 font-medium"
                    : "text-text-secondary hover:bg-surface-0 hover:text-text-primary"
                )}
              >
                <span>{t(`filters.status_${status}`)}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-xs tabular-nums",
                      active ? "bg-primary-600/10 text-primary-600" : "bg-accent-100 text-text-secondary"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Tags */}
      {Object.keys(tagCounts).length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-text-secondary">
            {t("filters.tags")}
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(tagCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 12)
              .map(([tag, count]) => {
                const active = params.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    role="checkbox"
                    aria-checked={active}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "border-primary-600 bg-primary-600 text-white shadow-sm"
                        : "border-border bg-surface-0 text-text-secondary hover:border-primary-500 hover:text-text-primary"
                    )}
                  >
                    {tag}
                    <span className={cn("tabular-nums", active ? "text-white/80" : "text-text-secondary/70")}>
                      {count}
                    </span>
                  </button>
                );
              })}
          </div>
        </fieldset>
      )}

      {/* Created date range */}
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-text-secondary">
          {t("filters.createdFrom")} – {t("filters.createdTo")}
        </legend>
        <div className="flex flex-col gap-2">
          <label className="sr-only" htmlFor="created-from">
            {t("filters.createdFrom")}
          </label>
          <input
            id="created-from"
            type="date"
            value={params.created_from}
            onChange={(e) => setParams({ created_from: e.target.value })}
            className="h-11 rounded-lg border border-border bg-surface-0 px-3 text-sm text-text-primary focus:border-primary-600 focus:outline-none"
          />
          <label className="sr-only" htmlFor="created-to">
            {t("filters.createdTo")}
          </label>
          <input
            id="created-to"
            type="date"
            value={params.created_to}
            onChange={(e) => setParams({ created_to: e.target.value })}
            className="h-11 rounded-lg border border-border bg-surface-0 px-3 text-sm text-text-primary focus:border-primary-600 focus:outline-none"
          />
        </div>
      </fieldset>

      <Button variant="outline" fullWidth onClick={clearFilters}>
        {t("filters.clear")}
      </Button>
    </aside>
  );
}
