"use client";

import { ArrowDown, ArrowUp, FunnelSimple } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils";

/**
 * Sort + direction control — US-033 (T137).
 *
 * Two sibling buttons that look like one segmented control: clicking the
 * label cycles `sort` among score / created_at / views_count; the arrow
 * button toggles `dir`. Both are persisted to the URL via `setParams`
 * (keeping every other filter intact).
 */
const SORT_KEYS = ["score", "created_at", "views_count"];

export function SortControl({ params, setParams, className }) {
  const t = useTranslations("search.sort");

  const cycleSort = () => {
    const idx = SORT_KEYS.indexOf(params.sort);
    const next = SORT_KEYS[(idx + 1) % SORT_KEYS.length];
    setParams({ sort: next });
  };

  const toggleDir = () => {
    setParams({ dir: params.dir === "asc" ? "desc" : "asc" });
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <FunnelSimple size={18} className="text-text-secondary" aria-hidden />
      <div
        role="group"
        aria-label={t("label")}
        className="flex items-center gap-1 rounded-lg border border-border bg-surface-1 p-1"
      >
        <button
          type="button"
          onClick={cycleSort}
          aria-label={t("label")}
          className="flex h-10 items-center rounded-md px-3 text-sm font-medium text-text-primary transition-colors hover:bg-accent-100 hover:text-primary-600"
        >
          {t(params.sort)}
        </button>
        <button
          type="button"
          onClick={toggleDir}
          aria-label={params.dir === "asc" ? t("asc") : t("desc")}
          aria-pressed={params.dir === "asc"}
          className="flex h-10 w-10 items-center justify-center rounded-md text-primary-600 transition-colors hover:bg-accent-100"
        >
          {params.dir === "asc" ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
        </button>
      </div>
    </div>
  );
}
