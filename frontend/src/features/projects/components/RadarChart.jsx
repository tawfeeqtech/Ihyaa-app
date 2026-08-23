"use client";

import { useMemo } from "react";
import { cn } from "@/shared/utils";

/**
 * RadarChart — lightweight, no-dependency SVG radar (pentagon) for the five
 * AI evaluation dimensions. Uses design tokens (CSS vars) so it adapts to
 * dark/light mode automatically.
 *
 * @param {Object}  dimensions  Map of the 5 scores (0–100). Missing/null keys
 *                              are treated as 0 (vertex at center).
 * @param {string[]} labels     5 translated labels in axis order.
 * @param {number}  size        ViewBox size (default 260).
 */
export function RadarChart({ dimensions = {}, labels = [], size = 260, className }) {
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

  const dataPoints = AXES.map((axis) => {
    const score = dimensions[axis.key];
    const value = typeof score === "number" ? Math.min(Math.max(score, 0), 100) : 0;
    return { axis, value, ...point(axis, (radius * value) / 100) };
  });

  const polygon = dataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <div className={cn("flex justify-center", className)}>
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

        {/* Data polygon */}
        <polygon
          points={polygon}
          fill="var(--color-primary-600)"
          fillOpacity={0.15}
          stroke="var(--color-primary-600)"
          strokeWidth={2}
          strokeLinejoin="round"
        />

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
    </div>
  );
}
