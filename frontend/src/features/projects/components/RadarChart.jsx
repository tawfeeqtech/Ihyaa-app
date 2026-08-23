"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils";

/**
 * RadarChart — lightweight, no-dependency SVG radar (pentagon) for the AI
 * evaluation dimensions (T092). Uses design tokens (CSS vars) so it adapts to
 * dark/light mode automatically.
 *
 * Partial reports (T095): dimensions with a `null` score are treated as
 * MISSING — they are excluded from the data polygon (never drawn at the
 * centre) and listed as a clear "missing dimension" indicator below the chart
 * via the `missingDimensions` prop.
 *
 * @param {Object}  dimensions          Map of the 5 scores (0–100). Missing/null
 *                                      keys are excluded from the polygon.
 * @param {string[]} labels             5 translated labels in axis order.
 * @param {number}  size                ViewBox size (default 260).
 * @param {Array<{key?:string,label:string}>} missingDimensions  Completed-missing
 *                                      dimensions to flag (partial report).
 */
export function RadarChart({ dimensions = {}, labels = [], size = 260, missingDimensions = [], className }) {
  const t = useTranslations("projects");
  const AXES = useMemo(() => {
    // 5 axes starting at the top (-90°) and going clockwise in SVG coords.
    return Array.from({ length: 5 }, (_, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      return {
        angle,
        cos: Math.cos(angle),
        sin: Math.sin(angle),
        key: ["technical", "innovation", "market", "team", "documentation"][i],
      };
    });
  }, []);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 46; // leave room for the axis labels
  const labelRadius = radius + 22;

  const point = (axis, r) => ({
    x: cx + axis.cos * r,
    y: cy + axis.sin * r,
  });

  const gridRings = [25, 50, 75, 100].map((pct) => {
    const r = (radius * pct) / 100;
    return {
      pct,
      points: AXES.map((a) => point(a, r)),
    };
  });

  // Only completed dimensions participate in the data polygon. A missing
  // dimension (null / not present) is excluded — NOT drawn at the centre —
  // so a 3/5 partial report draws a clear triangle, not a misleading shape.
  const presentAxes = AXES.filter((axis) => {
    const score = dimensions[axis.key];
    return typeof score === "number" && !Number.isNaN(score);
  });

  const dataPoints = presentAxes.map((axis) => {
    const score = Math.min(Math.max(dimensions[axis.key], 0), 100);
    return { axis, value: score, ...point(axis, (radius * score) / 100) };
  });

  const canDrawPolygon = dataPoints.length >= 3;
  const polygon = canDrawPolygon
    ? dataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
    : "";

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="h-auto max-w-full"
        role="img"
        aria-label={labels.join(", ")}
      >
        {/* Grid rings */}
        {gridRings.map((ring) => (
          <polygon
            key={ring.pct}
            points={ring.points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={1}
          />
        ))}

        {/* Axis spokes */}
        {AXES.map((axis) => {
          const tip = point(axis, radius);
          return (
            <line
              key={axis.key}
              x1={cx}
              y1={cy}
              x2={tip.x}
              y2={tip.y}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
          );
        })}

        {/* Data polygon — only when ≥3 completed dimensions */}
        {canDrawPolygon && (
          <polygon
            points={polygon}
            fill="var(--color-primary-600)"
            fillOpacity={0.15}
            stroke="var(--color-primary-600)"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        )}

        {/* Data vertices */}
        {dataPoints.map((p) => (
          <circle key={p.axis.key} cx={p.x} cy={p.y} r={3.5} fill="var(--color-primary-600)" />
        ))}

        {/* Axis labels */}
        {AXES.map((axis, i) => {
          const pos = point(axis, labelRadius);
          const textAnchor =
            axis.cos < -0.3 ? "end" : axis.cos > 0.3 ? "start" : "middle";
          const dominantBaseline =
            axis.sin < -0.3 ? "text-after-edge" : axis.sin > 0.3 ? "text-before-edge" : "middle";
          return (
            <text
              key={axis.key}
              x={pos.x}
              y={pos.y}
              textAnchor={textAnchor}
              dominantBaseline={dominantBaseline}
              fontSize={11}
              fill="var(--color-text-secondary)"
              fontFamily="inherit"
            >
              {labels[i] ?? axis.key}
            </text>
          );
        })}
      </svg>

      {/* Missing-dimension indicator — partial report (T095 · US-025) */}
      {missingDimensions.length > 0 && (
        <p
          role="note"
          className="mt-3 max-w-md rounded-lg border border-warning/40 bg-tint-warning px-3 py-2 text-center text-xs font-medium text-warning-ink"
        >
          {t("report.partialIndicator", {
            count: missingDimensions.length,
            list: missingDimensions.map((m) => m.label).join("، "),
          })}
        </p>
      )}
    </div>
  );
}
