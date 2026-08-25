"use client";

import { useTranslations } from "next-intl";
import { ChartPieSlice, Warning } from "@phosphor-icons/react";
import { cn } from "@/shared/utils";

/**
 * EPIC-15 — Report templates for the three AI Agent analysis types
 * (US-081..084). Text/template only (الدستور VI — no external MCP in MVP).
 * Pure presentational components: they receive the stored `artifact_data`
 * (already grounded in the project's latest evaluation by the backend) and
 * translate the labels. All list rendering tolerates missing/empty arrays.
 */

/** Compact USD formatter (e.g. $12.5M, $1.2B). */
function formatUsd(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

const DOT_TONES = {
  default: "bg-primary-600",
  success: "bg-success",
  warning: "bg-warning",
};

/** A titled bullet list section (shared by SWOT categories + competitive blocks). */
function BulletCard({ title, items, tone = "default" }) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return null;

  return (
    <section className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm">
      <h4 className="mb-3 font-heading text-sm font-semibold text-text-primary">{title}</h4>
      <ul className="space-y-2">
        {list.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
            <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", DOT_TONES[tone])} aria-hidden />
            <span className="min-w-0 break-words">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** SWOT template — summary + 2×2 categories + recommendations (US-081 · T109/T110). */
export function SwotTemplate({ data = {} }) {
  const t = useTranslations("aiAgent");
  const {
    summary = "",
    strengths = [],
    weaknesses = [],
    opportunities = [],
    threats = [],
    recommendations = [],
    derived_from = [],
  } = data;

  const categories = [
    { key: "strengths", items: strengths },
    { key: "weaknesses", items: weaknesses },
    { key: "opportunities", items: opportunities },
    { key: "threats", items: threats },
  ];

  return (
    <div className="space-y-5">
      {summary ? (
        <p className="rounded-xl border border-border bg-surface-1 p-4 text-sm leading-relaxed text-text-primary">
          {summary}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {categories.map((cat) => (
          <BulletCard key={cat.key} title={t(`swot.categories.${cat.key}`)} items={cat.items} />
        ))}
      </div>
      <BulletCard title={t("swot.recommendations")} items={recommendations} tone="success" />
      {Array.isArray(derived_from) && derived_from.length > 0 ? (
        <p className="text-xs text-text-secondary">{t("swot.derivedFrom")}</p>
      ) : null}
    </div>
  );
}

/** Comparison template — table of similar evaluated projects (US-080 · T101/T106). */
export function ComparisonTemplate({ data = {} }) {
  const t = useTranslations("aiAgent");
  const { competitors = [], count = 0, insufficient_data_note = false } = data;

  return (
    <div className="space-y-4">
      <h4 className="font-heading text-base font-semibold text-text-primary">
        {t("comparison.competitorsTitle", { count: Number.isInteger(count) ? count : competitors.length })}
      </h4>

      {insufficient_data_note && (
        <p className="flex items-center gap-2 rounded-lg bg-tint-warning px-3 py-2 text-sm text-warning-ink">
          <Warning size={18} aria-hidden />
          {t("comparison.insufficientNote")}
        </p>
      )}

      {!Array.isArray(competitors) || competitors.length === 0 ? (
        <p className="text-sm text-text-secondary">{t("comparison.noCompetitors")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface-1 shadow-sm">
          <table className="w-full min-w-80 text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-text-secondary">
                <th scope="col" className="px-4 py-3 font-medium text-start">
                  {t("comparison.titleCol")}
                </th>
                <th scope="col" className="px-4 py-3 font-medium text-start">
                  {t("comparison.score")}
                </th>
                <th scope="col" className="px-4 py-3 font-medium text-start">
                  {t("comparison.overlap")}
                </th>
              </tr>
            </thead>
            <tbody>
              {competitors.map((c) => (
                <tr key={c.id ?? c.title} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-text-primary">{c.title}</td>
                  <td className="px-4 py-3 tabular-nums text-text-secondary">
                    {typeof c.ai_score === "number" ? Math.round(c.ai_score) : "—"}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-text-secondary">
                    {typeof c.tag_overlap === "number" ? c.tag_overlap : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Competitive report template — blocks + market share range (US-082 · T111..T113). */
export function CompetitiveTemplate({ data = {} }) {
  const t = useTranslations("aiAgent");
  const {
    competitive_advantage = [],
    differentiators = [],
    gaps_to_address = [],
    recommendations = [],
    market_share = {},
    comparison = {},
  } = data;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <BulletCard title={t("competitive.advantage")} items={competitive_advantage} />
        <BulletCard title={t("competitive.differentiators")} items={differentiators} />
        <BulletCard title={t("competitive.gaps")} items={gaps_to_address} tone="warning" />
        <BulletCard title={t("competitive.recommendations")} items={recommendations} tone="success" />
      </div>

      <MarketShareCard share={market_share} />

      {comparison?.insufficient_data_note && (
        <p className="flex items-center gap-2 rounded-lg bg-tint-warning px-3 py-2 text-sm text-warning-ink">
          <Warning size={18} aria-hidden />
          {t("comparison.insufficientNote")}
        </p>
      )}
    </div>
  );
}

/** Market share estimate card — deterministic range from config (T112). */
function MarketShareCard({ share = {} }) {
  const t = useTranslations("aiAgent");
  const {
    range_usd = {},
    market_size_usd = {},
    share_percent,
    assumptions = [],
    limitations = [],
  } = share;

  const hasRange = typeof range_usd?.min === "number" && typeof range_usd?.max === "number";
  const hasMarket = typeof market_size_usd?.min === "number" && typeof market_size_usd?.max === "number";

  return (
    <section className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm">
      <h4 className="mb-3 flex items-center gap-2 font-heading text-sm font-semibold text-text-primary">
        <ChartPieSlice size={18} aria-hidden className="text-primary-600" />
        {t("competitive.marketShare")}
      </h4>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-surface-0 p-3">
          <p className="text-xs text-text-secondary">{t("competitive.range")}</p>
          <p className="mt-1 font-heading text-base font-semibold tabular-nums text-text-primary" dir="ltr">
            {hasRange ? `$${formatUsd(range_usd.min)} – $${formatUsd(range_usd.max)}` : t("noData")}
          </p>
        </div>
        {typeof share_percent === "number" && (
          <div className="rounded-lg bg-surface-0 p-3">
            <p className="text-xs text-text-secondary">{t("competitive.sharePercent")}</p>
            <p className="mt-1 font-heading text-base font-semibold tabular-nums text-text-primary">
              {share_percent}%
            </p>
          </div>
        )}
        <div className="rounded-lg bg-surface-0 p-3">
          <p className="text-xs text-text-secondary">{t("competitive.marketSize")}</p>
          <p className="mt-1 font-heading text-base font-semibold tabular-nums text-text-primary" dir="ltr">
            {hasMarket ? `$${formatUsd(market_size_usd.min)} – $${formatUsd(market_size_usd.max)}` : t("noData")}
          </p>
        </div>
      </div>

      {(assumptions.length > 0 || limitations.length > 0) && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {Array.isArray(assumptions) && assumptions.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-text-secondary">{t("competitive.assumptions")}</p>
              <ul className="space-y-1.5">
                {assumptions.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-text-secondary/50" aria-hidden />
                    <span className="min-w-0 break-words">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {Array.isArray(limitations) && limitations.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-text-secondary">{t("competitive.limitations")}</p>
              <ul className="space-y-1.5">
                {limitations.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-text-secondary/50" aria-hidden />
                    <span className="min-w-0 break-words">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
