import { Skeleton, SkeletonCard, SkeletonText } from "@/components/ui/Skeleton";

/** Generic loading skeleton for any page under [locale] while server
 *  components stream (SSR/RSC). Skeletons over spinners — design-decisions.md §7. */
export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-6 sm:px-6 lg:px-8"
    >
      <span className="sr-only">Loading…</span>

      {/* Hero block */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-2/3 max-w-xl" />
        <SkeletonText lines={2} className="max-w-lg" />
      </div>

      {/* Content card grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Wide panel */}
      <div className="space-y-4 rounded-xl border border-border bg-surface-1 p-6">
        <Skeleton className="h-6 w-40" />
        <SkeletonText lines={3} />
      </div>
    </div>
  );
}
