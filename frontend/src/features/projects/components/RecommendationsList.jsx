"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils";
import { Lightning, ClockCountdown, CalendarBlank } from "@phosphor-icons/react";

/**
 * RecommendationsList — التوصيات بثلاثة آفاق زمنية (T098 · US-026).
 *
 * `immediate` (فورية) / `short_term` (قصيرة المدى) / `long_term` (طويلة المدى)
 * من `evaluation.recommendations` — كل أفق في بطاقة منفصلة؛ الآفاق الفارغة تُعرض
 * بحالة "لا توصيات" بدل الاختفاء (اتساق بصري).
 *
 * @param {Object} recommendations { immediate: [], short_term: [], long_term: [] }
 */
export function RecommendationsList({ recommendations = {} }) {
  const t = useTranslations("projects");

  const horizons = [
    { key: "immediate", icon: Lightning, accent: "text-warning-ink bg-tint-warning" },
    { key: "short_term", icon: CalendarBlank, accent: "text-primary-600 bg-accent-100" },
    { key: "long_term", icon: ClockCountdown, accent: "text-success-ink bg-tint-success" },
  ];

  return (
    <section aria-label={t("report.recommendationsTitle")}>
      <h3 className="mb-4 font-heading text-lg font-bold">{t("report.recommendationsTitle")}</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        {horizons.map(({ key, icon: Icon, accent }) => {
          const items = Array.isArray(recommendations[key]) ? recommendations[key] : [];
          return (
            <div
              key={key}
              className="flex flex-col rounded-xl border border-border bg-surface-1 p-5"
            >
              <h4 className={cn("mb-3 flex items-center gap-2 rounded-lg px-3 py-1.5 font-heading text-sm font-bold", accent)}>
                <Icon size={16} weight="bold" aria-hidden />
                {t(`report.recommendationHorizons.${key}`)}
              </h4>
              {items.length > 0 ? (
                <ul className="space-y-2">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-primary">
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-text-secondary/50" />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-text-secondary">{t("report.noRecommendations")}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
