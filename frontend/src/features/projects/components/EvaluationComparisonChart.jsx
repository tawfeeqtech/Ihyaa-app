"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/shared/utils";
import { DIMENSION_KEY_MAP } from "../lib/report";

/**
 * EvaluationComparisonChart — dependency-free SVG line chart (T084 · US-023).
 *
 * Plots the 5 evaluation dimensions across the last evaluations (newest-first
 * `comparison` array from GET /evaluations?include=comparison). Each dimension
 * line is coloured by its trend across the period:
 *   improved  → success (green)   · regressed → danger (red)   · flat → neutral
 *
 * Charts stay LTR regardless of UI direction so numeric axes read correctly;
 * the container is wrapped in `dir="ltr"`.
 *
 * @param {Object} props
 * @param {Array<{version:number, completed_at:string, dimensions:Object}>} [props.comparison]
 *   Newest-first evaluation comparisons (owner-only).
 */
export function EvaluationComparisonChart({ comparison = [], className }) {
  const t = useTranslations("projects");
  const locale = useLocale();

  const W = 560;
  const H = 320;
  const PAD = { top: 24, right: 20, bottom: 48, left: 44 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const DIMENSION_ORDER = [
    "technical_quality",
    "innovation",
    "market_viability",
    "team_completeness",
    "documentation",
  ];

  const model = useMemo(() => {
    // The backend returns the comparison newest-first → flip to chronological.
    const chronological = [...comparison].reverse();
    if (chronological.length < 2) return null;

    const n = chronological.length;
    const xFor = (i) => PAD.left + (n <= 1 ? plotW / 2 : (i * plotW) / (n - 1));
    const yFor = (score) =>
      PAD.top + plotH - (Math.max(0, Math.min(100, score)) / 100) * plotH;

    const dimensions = DIMENSION_ORDER.map((fullKey) => {
      const short = DIMENSION_KEY_MAP[fullKey] ?? fullKey;
      const values = chronological.map((c) => {
        const v = c.dimensions?.[fullKey];
        return typeof v === "number" && !Number.isNaN(v) ? v : null;
      });

      // Trend = last completed vs first completed value across the period.
      const present = values.filter((v) => v !== null);
      let trend = "flat";
      if (present.length >= 2) {
        const first = present[0];
        const last = present[present.length - 1];
        trend = last > first ? "up" : last < first ? "down" : "flat";
      }

      // Path across present points — a null (missing) score breaks the line.
      let d = "";
      let pen = false;
      values.forEach((v, i) => {
        if (v === null) {
          pen = false;
          return;
        }
        const x = xFor(i);
        const y = yFor(v);
        d += `${pen ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)} `;
        pen = true;
      });

      return { fullKey, short, values, trend, d };
    });

    return {
      versions: chronological.map((c) => c.version),
      dimensions,
      xFor,
      yFor,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparison]);

  if (!model) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border bg-surface-1 p-6 text-center text-sm text-text-secondary",
          className
        )}
      >
        {t("report.comparisonEmpty")}
      </div>
    );
  }

  const gridLines = [0, 25, 50, 75, 100];
  const trendColor = (trend) => {
    if (trend === "up") return "var(--color-success)";
    if (trend === "down") return "var(--color-danger)";
    return "var(--color-text-secondary)";
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div dir="ltr" className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="h-auto max-w-full"
          role="img"
          aria-label={t("report.comparisonTitle")}
        >
          {/* Horizontal grid + Y labels (0–100) */}
          {gridLines.map((val) => {
            const y = model.yFor(val);
            return (
              <g key={val}>
                <line
                  x1={PAD.left}
                  y1={y}
                  x2={W - PAD.right}
                  y2={y}
                  stroke="var(--color-border)"
                  strokeWidth={1}
                  strokeDasharray={val === 0 || val === 100 ? "0" : "4 4"}
                />
                <text x={PAD.left - 8} y={y + 3} textAnchor="end" fontSize={10} fill="var(--color-text-secondary)">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Dimension lines */}
          {model.dimensions.map((dim) => (
            <g key={dim.fullKey}>
              <title>
                {t(`report.dimensions.${dim.short}`)} — {t(`report.comparisonTrend.${dim.trend}`)}
              </title>
              {dim.d && (
                <path
                  d={dim.d}
                  fill="none"
                  stroke={trendColor(dim.trend)}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {dim.values.map((v, i) =>
                v === null ? null : (
                  <circle
                    key={`${dim.fullKey}-${i}`}
                    cx={model.xFor(i)}
                    cy={model.yFor(v)}
                    r={3.5}
                    fill={trendColor(dim.trend)}
                    stroke="var(--color-surface-0)"
                    strokeWidth={1.5}
                  />
                )
              )}
            </g>
          ))}

          {/* Version labels */}
          {model.versions.map((version, i) => (
            <text
              key={`v-${version}`}
              x={model.xFor(i)}
              y={H - PAD.bottom + 18}
              textAnchor="middle"
              fontSize={10}
              fill="var(--color-text-secondary)"
            >
              {locale === "ar" ? `الإصدار ${version}` : `v${version}`}
            </text>
          ))}
        </svg>
      </div>

      {/* Legend — dimension + trend direction */}
      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {model.dimensions.map((dim) => (
          <li
            key={dim.fullKey}
            className="flex items-center gap-1.5 text-xs text-text-secondary"
            title={t(`report.comparisonTrend.${dim.trend}`)}
          >
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: trendColor(dim.trend) }}
            />
            {t(`report.dimensions.${dim.short}`)}
            <span
              aria-hidden
              className={cn(
                "font-bold",
                dim.trend === "up" && "text-success",
                dim.trend === "down" && "text-danger"
              )}
            >
              {dim.trend === "up" ? "▲" : dim.trend === "down" ? "▼" : ""}
            </span>
            <span className="sr-only">{t(`report.comparisonTrend.${dim.trend}`)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
