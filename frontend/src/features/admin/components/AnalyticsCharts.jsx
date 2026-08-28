"use client";

/**
 * EPIC-12 — Admin analytics charts (US-061/062).
 *
 * Recharts-based Pie (sector_distribution) + Line (active_users_7d). When
 * `chart_sufficient` is false the chart is replaced by an Arabic-first
 * "insufficient data" message (admin-api.md §1 · US-061/062).
 *
 * The Line chart is a single series → one hue, no legend box (the title names
 * it). The Pie always ships a manual legend (identity never color-alone) and a
 * `<table>` fallback is provided by the parent page.
 */

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartPieSlice, LineSegments, WarningCircle } from "@phosphor-icons/react";

/** Light-mode fallbacks for the categorical palette (globals.css `--chart-*`). */
const SECTOR_FALLBACK = ["#245173", "#e09a2e", "#2f8f6f", "#7a5a9c", "#355e7e"];

/**
 * Read the app's CSS design tokens once per theme change so chart ink/grid and
 * the categorical palette inherit the correct colors in light and dark mode.
 * Recharts fills/strokes are plain SVG attributes (no CSS var()), so we resolve
 * them to concrete hex.
 */
function useThemeTokens() {
  const [tokens, setTokens] = useState({
    text: "#1a2b3a",
    secondary: "#5b6b7a",
    grid: "#e0e2ec",
    sector: SECTOR_FALLBACK,
  });

  useEffect(() => {
    const read = () => {
      const s = getComputedStyle(document.documentElement);
      const val = (name, fallback) => s.getPropertyValue(name).trim() || fallback;
      const sector = SECTOR_FALLBACK.map((_, i) => val(`--chart-${i + 1}`, SECTOR_FALLBACK[i]));
      setTokens({
        text: val("--color-text-primary", "#1a2b3a"),
        secondary: val("--color-text-secondary", "#5b6b7a"),
        grid: val("--color-border", "#e0e2ec"),
        sector,
      });
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return tokens;
}

/** Shared Recharts tooltip shell — keeps labels/values in design-system ink. */
function ChartTooltip({ active, payload, label, valueName }) {
  if (!active || !payload?.length) return null;
  const point = payload[0];
  return (
    <div className="rounded-lg border border-border bg-surface-1 px-3 py-2 text-xs shadow-md">
      <p className="font-heading font-semibold text-text-primary">
        {label ?? point.name}
      </p>
      <p className="mt-0.5 text-text-secondary">
        {valueName}:{" "}
        <span className="font-semibold text-text-primary">{point.value}</span>
      </p>
    </div>
  );
}

/** Empty-state substitute shown when the data can't support a chart. */
function Insufficient({ icon: IconComponent, message }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface-0/60 px-6 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-tint-warning text-warning-ink">
        <WarningCircle size={22} weight="fill" aria-hidden />
      </span>
      <p className="max-w-xs text-sm text-text-secondary">{message}</p>
    </div>
  );
}

/**
 * Pie chart for sector_distribution. Renders a manual legend (name + count +
 * share) beside the pie so identity is never color-alone, with an
 * insufficient-data state when chart_sufficient.sector is false.
 */
export function SectorPie({ data, sufficient }) {
  const t = useTranslations("admin.sector");
  const tokens = useThemeTokens();

  if (!sufficient) {
    return <Insufficient icon={ChartPieSlice} message={t("insufficient")} />;
  }

  const palette = tokens.sector;

  return (
    <div dir="ltr">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Pie
            data={data}
            dataKey="count"
            nameKey="category"
            innerRadius={54}
            outerRadius={90}
            paddingAngle={2}
            strokeWidth={2}
            stroke="#ffffff"
          >
            {data.map((entry, i) => (
              <Cell
                key={entry.category ?? i}
                fill={palette[i % palette.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip valueName={t("count")} />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Manual legend — works in RTL and always ships identity labels. */}
      <ul className="mt-3 space-y-1.5">
        {data.map((entry, i) => (
          <li
            key={entry.category ?? i}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: palette[i % palette.length] }}
              />
              <span className="truncate text-text-primary">{entry.category}</span>
            </span>
            <span className="shrink-0 text-text-secondary" dir="ltr">
              <span className="font-semibold text-text-primary">{entry.count}</span>
              {typeof entry.percentage === "number" && (
                <span className="ms-2">({entry.percentage}%)</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Line chart for active_users_7d (always 7 rows — gaps drawn as zero). Single
 * series → single hue, no legend box. Insufficient-data state when
 * chart_sufficient.active_users is false.
 */
export function ActiveUsersLine({ data, sufficient }) {
  const t = useTranslations("admin.activeUsers");
  const tokens = useThemeTokens();

  if (!sufficient) {
    return <Insufficient icon={LineSegments} message={t("insufficient")} />;
  }

  // Short date labels ("MM-DD") keep ticks compact; the tooltip keeps full dates.
  const rows = data.map((row) => ({
    ...row,
    label: String(row.date).slice(5),
  }));

  return (
    <div dir="ltr">
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={tokens.grid} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: tokens.secondary, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: tokens.grid }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: tokens.secondary, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={<ChartTooltip valueName={t("count")} labelFormatter={(l, p) => p?.[0]?.payload?.date ?? l} />}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke={tokens.sector[0]}
            strokeWidth={2.5}
            dot={{ r: 4, fill: tokens.sector[0], strokeWidth: 2, stroke: "#ffffff" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
