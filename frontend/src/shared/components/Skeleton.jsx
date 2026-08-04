"use client";

import { cn } from "@/shared/utils";

/**
 * Skeleton loading placeholders — used for AI tasks instead of spinners
 * (design-decisions.md §7: "Skeleton بدل spinners لمهام AI").
 */

export function Skeleton({ className }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-md bg-accent-100",
        className
      )}
    />
  );
}

/** A few lines of text (heights vary for a natural look). */
export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 && "w-2/3")}
        />
      ))}
    </div>
  );
}

/** Avatar-style circle. */
export function SkeletonCircle({ className }) {
  return <Skeleton className={cn("h-12 w-12 rounded-full", className)} />;
}

/** Full project card placeholder. */
export function SkeletonCard({ className }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-surface-1 shadow-sm",
        className
      )}
    >
      <Skeleton className="h-40 rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-5 w-2/3" />
        <SkeletonText lines={2} />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex items-center justify-between pt-2">
          <SkeletonCircle className="h-8 w-8" />
          <Skeleton className="h-6 w-14" />
        </div>
      </div>
    </div>
  );
}
