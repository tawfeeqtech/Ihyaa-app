"use client";

import { BookmarkSimple, CheckCircle, PaperPlaneTilt } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { cn, formatNumber } from "@/shared/utils";

/**
 * EPIC-11 · Investor KPI grid (US-057 · T086) — dashboard-api.md §2.kpis.
 *
 * Three widgets: طلبات مرسلة (لا تشمل الملغاة) · طلبات مقبولة · مشاريع متابعة
 * (= المحفوظات). Zero activity renders 0 — no empty screen (SRS-UI-23).
 *
 * Deliberately separate from EPIC-10's owner `KpiGrid` (kpi-grid.jsx) so the
 * two dashboards stay independent.
 */
export function InvestorKpiGrid({ kpis, className }) {
  const t = useTranslations("dashboard");

  const widgets = [
    { key: "sent_requests", value: kpis?.sent_requests ?? 0, icon: PaperPlaneTilt },
    { key: "accepted_requests", value: kpis?.accepted_requests ?? 0, icon: CheckCircle },
    { key: "followed_projects", value: kpis?.followed_projects ?? 0, icon: BookmarkSimple },
  ];

  return (
    <div className={cn("grid grid-cols-2 gap-4 xl:grid-cols-3", className)}>
      {widgets.map(({ key, value, icon: IconComponent }) => (
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
            {formatNumber(value)}
          </p>
          <p className="relative mt-0.5 text-sm text-text-secondary">
            {t(`investor.kpis.${key}`)}
          </p>
        </div>
      ))}
    </div>
  );
}
