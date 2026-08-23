"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils";
import { getScoreTier } from "./AIScoreBadge";
import { GAP_CATEGORIES, GAP_TO_DIMENSION, DIMENSION_KEY_MAP } from "../lib/report";

/**
 * GapAnalysisPanel — تحليل الفجوات بأربع فئات (T097 · US-026).
 *
 * الفئات الثابتة: تقنية / سوقية / فريق / توثيق. كل فئة **مرتبطة بصرياً بدرجة
 * بُعدها المرافق** (T099): بُعد منخفض ↔ فجوة في فئته — تُعرض درجة البُعد
 * بجوار عنوان الفئة مع تلوين حسب المستوى (أحمر ضعيف → أخضر ممتاز).
 *
 * @param {Object} gaps            evaluation.gap_analysis
 *                                 { technical_gaps: [], market_gaps: [], team_gaps: [], documentation_gaps: [] }
 * @param {Object} dimensionScores Map of FULL dimension keys → score (0-100)
 *                                 e.g. { technical_quality: 71.2, ... }
 */
export function GapAnalysisPanel({ gaps = {}, dimensionScores = {} }) {
  const t = useTranslations("projects");

  const categories = GAP_CATEGORIES.map((gapKey, i) => {
    const dimensionKey = GAP_TO_DIMENSION[gapKey];
    const short = DIMENSION_KEY_MAP[dimensionKey] ?? dimensionKey;
    const score = dimensionScores[dimensionKey];
    const tier = typeof score === "number" ? getScoreTier(score) : null;

    return {
      gapKey,
      dimensionKey,
      short,
      score,
      tier,
      items: Array.isArray(gaps[gapKey]) ? gaps[gapKey] : [],
      title: t(`report.gaps.${short}.title`),
    };
  });

  const priorityTier = (tier) =>
    tier === "weak" ? "high" : tier === "medium" ? "medium" : "low";

  const scoreChip = {
    weak: "bg-tint-danger text-danger-ink",
    medium: "bg-tint-warning text-warning-ink",
    good: "bg-tint-success text-success-ink",
    excellent: "bg-accent-100 text-primary-600",
  };

  return (
    <section aria-label={t("report.gapsTitle")}>
      <h3 className="mb-4 font-heading text-lg font-bold">{t("report.gapsTitle")}</h3>
      <div className="space-y-3">
        {categories.map(({ gapKey, title, items, score, tier, short }, i) => (
          <div
            key={gapKey}
            className={cn(
              "flex items-start gap-4 rounded-xl border border-border bg-surface-1 p-5",
              items.length === 0 && "opacity-80"
            )}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-100 font-heading text-sm font-bold text-primary-600">
              {i + 1}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-heading text-sm font-semibold text-text-primary">{title}</p>

                {/* T099: درجة البُعد المرافق — بُعد منخفض ↔ فجوة في فئته */}
                {typeof score === "number" ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      scoreChip[tier]
                    )}
                    title={`${t(`report.dimensions.${short}`)}: ${score}/100`}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "h-2 w-2 rounded-full",
                        tier === "weak"
                          ? "bg-danger"
                          : tier === "medium"
                            ? "bg-warning"
                            : tier === "good"
                              ? "bg-success"
                              : "bg-primary-600"
                      )}
                    />
                    {t(`report.dimensions.${short}`)} · {Math.round(score)}
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center rounded-full bg-surface-0 px-2.5 py-0.5 text-xs font-semibold text-text-secondary"
                    title={t(`report.dimensions.${short}`)}
                  >
                    {t(`report.dimensions.${short}`)} · —
                  </span>
                )}

                {/* أولوية الفجوة مشتقة من درجة البُعد (لا حقل منفصل في العقد) */}
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    tier === "weak"
                      ? "bg-tint-danger text-danger-ink"
                      : tier === "medium"
                        ? "bg-tint-warning text-warning-ink"
                        : "bg-tint-success text-success-ink"
                  )}
                >
                  {t(`report.priority.${priorityTier(tier)}`)}
                </span>
              </div>

              <div className="mt-1.5 space-y-1">
                {items.length > 0 ? (
                  items.map((item, idx) => (
                    <p key={idx} className="flex items-start gap-2 text-sm text-text-primary">
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-text-secondary/50" />
                      {item}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-text-secondary">{t("report.noGaps")}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
