"use client";

import { WarningCircle } from "@phosphor-icons/react";
import { cn } from "@/shared/utils";
import { Button } from "@/shared/components/Button";

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

/**
 * Error state — shown when a data fetch fails, so a network error is never
 * mistaken for an empty result. Danger-tinted and offers a retry action
 * (and optionally extra actions like clearing filters) via `action`.
 */
export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel,
  action,
  icon: IconComponent = WarningCircle,
  className,
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-danger/30 bg-tint-danger/40 px-6 py-14 text-center",
        className
      )}
    >
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-tint-danger">
        <IconComponent size={32} weight="light" className="text-danger" aria-hidden />
      </span>
      <h3 className="font-heading text-lg font-semibold text-text-primary">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm text-text-secondary">{description}</p>
      )}
      {(onRetry || action) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {onRetry && (
            <Button type="button" variant="secondary" onClick={onRetry}>
              {retryLabel}
            </Button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}
