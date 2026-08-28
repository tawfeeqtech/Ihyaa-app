"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useLocale } from "next-intl";
import { cn } from "@/shared/utils";

/**
 * PaginationBar — prev/next + page numbers with a sliding window.
 *
 * Designed for RTL: the arrow icons flip automatically based on the active
 * locale (CaretRight means "forward" in both directions).
 *
 * Labels (prevLabel / nextLabel / ariaLabel) are passed in from the caller so
 * translations stay with the page that owns them.
 *
 * Touch targets are ≥ 48px (min-h-12 / w-12) per design-decisions.md §4.
 */
function buildPages(current, total) {
  // Page window: current ± 1, always show first and last, ellipsis elsewhere.
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);

  const withEllipsis = [];
  let prev = 0;
  for (const n of sorted) {
    if (n - prev > 1) withEllipsis.push("…");
    withEllipsis.push(n);
    prev = n;
  }
  return withEllipsis;
}

export default function PaginationBar({
  currentPage,
  totalPages,
  onPageChange,
  ariaLabel = "Pagination",
  prevLabel = "Previous",
  nextLabel = "Next",
  className,
}) {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const total = Math.max(1, totalPages ?? 1);
  const current = Math.min(Math.max(1, currentPage ?? 1), total);

  const go = (n) => {
    const next = Math.min(Math.max(1, n), total);
    if (next !== current) onPageChange(next);
  };

  const pages = buildPages(current, total);

  const arrowClasses =
    "flex min-h-12 items-center gap-1 rounded-lg border border-border px-3 text-sm font-medium text-text-primary transition-colors hover:bg-surface-1 disabled:pointer-events-none disabled:opacity-40";

  return (
    <nav aria-label={ariaLabel} className={cn("flex items-center justify-center gap-1.5 pt-4", className)}>
      <button
        type="button"
        onClick={() => go(current - 1)}
        disabled={current <= 1}
        aria-label={prevLabel}
        className={arrowClasses}
      >
        {isRtl ? <CaretRight size={16} aria-hidden /> : <CaretLeft size={16} aria-hidden />}
        <span>{prevLabel}</span>
      </button>

      <ul className="flex items-center gap-1.5">
        {pages.map((p, idx) =>
          p === "…" ? (
            <li key={`ellipsis-${idx}`} aria-hidden className="px-1 text-sm text-text-secondary">
              …
            </li>
          ) : (
            <li key={p}>
              <button
                type="button"
                onClick={() => go(p)}
                aria-current={p === current ? "page" : undefined}
                aria-label={`${ariaLabel} ${p}`}
                className={cn(
                  "min-h-12 w-12 rounded-lg font-heading text-sm font-semibold transition-colors",
                  p === current
                    ? "bg-primary-600 text-on-primary shadow-md"
                    : "text-text-secondary hover:bg-surface-1"
                )}
              >
                {p}
              </button>
            </li>
          )
        )}
      </ul>

      <button
        type="button"
        onClick={() => go(current + 1)}
        disabled={current >= total}
        aria-label={nextLabel}
        className={arrowClasses}
      >
        <span>{nextLabel}</span>
        {isRtl ? <CaretLeft size={16} aria-hidden /> : <CaretRight size={16} aria-hidden />}
      </button>
    </nav>
  );
}
