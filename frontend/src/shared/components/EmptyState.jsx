"use client";

import { cn } from "@/shared/utils";

/**
 * Friendly empty state — 32px icon per the design system
 * (ui-ux-design-prompt-v2.md, icons section).
 */
export function EmptyState({
  icon: IconComponent,
  title,
  description,
  action,
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-surface-1/60 px-6 py-14 text-center",
        className
      )}
    >
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-100">
        <IconComponent size={32} weight="light" className="text-primary-600" />
      </span>
      <h3 className="font-heading text-lg font-semibold">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm text-text-secondary">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
