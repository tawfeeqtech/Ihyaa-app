"use client";

import {
  CheckCircle,
  FolderPlus,
  Heart,
  Info,
  Star,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { cn, formatNumber } from "@/shared/utils";

/**
 * EPIC-10 · KPI grid (US-052 · T058/T059) — dashboard-api.md §1.kpis.
 *
 * Four widgets: عدد المشاريع · متوسط التقييم · طلبات الاهتمام الواردة · المقبولين.
 * `average_score` is null when there are no completed evaluations → the UI shows
 * "—" (US-052 · T059). When `average_score_note` is present (some evaluations are
 * incomplete / excluded) a small disclosure hint is rendered (مبدأ I — إفصاح).
 *
 * Client component (Phosphor icons); labels from the `dashboard` namespace.
 */

export function KpiGrid({ kpis = {}, className }) {
  const t = useTranslations("dashboard");
  const widgets = [
    {
      key: "totalProjects",
      value: kpis?.total_projects ?? 0,
      icon: FolderPlus,
      hint: null,
    },
    {
      key: "averageScore",
      value: kpis?.average_score,
      icon: Star,
      hint: kpis?.average_score_note ?? null,
    },
    {
      key: "totalRequests",
      value: kpis?.total_requests_received ?? 0,
      icon: Heart,
      hint: null,
    },
    {
      key: "acceptedRequests",
      value: kpis?.accepted_requests ?? 0,
      icon: CheckCircle,
      hint: null,
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 gap-4 xl:grid-cols-4", className)}>
      {widgets.map(({ key, value, icon: IconComponent, hint }) => (
        <div
          key={key}
          className="relative overflow-hidden rounded-xl border border-border bg-surface-1 p-5 shadow-sm"
        >
          <span
            aria-hidden
            className="absolute -end-4 -top-4 h-20 w-20 rounded-full bg-accent-100/60"
          />
          <span className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-accent-100">
            <IconComponent size={20} weight="regular" className="text-primary-600" />
          </span>
          <p className="relative mt-4 font-heading text-2xl font-bold text-text-primary">
            {typeof value === "number" ? formatNumber(value) : "—"}
          </p>
          <p className="relative mt-0.5 text-sm text-text-secondary">{t(`owner.kpis.${key}`)}</p>
          {hint && (
            <p className="relative mt-2 flex items-start gap-1 text-[11px] leading-tight text-text-secondary/80">
              <Info size={12} className="mt-0.5 shrink-0" aria-hidden />
              <span>{t(`owner.kpis.${hint}`)}</span>
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
