"use client";

import { useTranslations } from "next-intl";
import { EmptyState, ErrorState } from "@/shared/components/EmptyState";
import PaginationBar from "@/shared/components/PaginationBar";

/**
 * InterestBoard — US-046 (T062).
 *
 * Shared chrome for the received/sent boards: friendly empty state +
 * 12-per-page pagination. Cards are rendered by the caller through `children`
 * so each board keeps its own layout (received vs sent cards differ).
 */
export function InterestBoard({
  loading,
  error = false,
  onRetry,
  items,
  emptyIcon: EmptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  page,
  totalPages,
  onPageChange,
  children,
}) {
  const t = useTranslations("interests");
  const tErrors = useTranslations("errors");

  if (loading) {
    return (
      <div className="space-y-3" aria-busy>
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            aria-hidden
            className="h-28 animate-pulse rounded-xl border border-border bg-surface-1"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title={tErrors("title")}
        description={tErrors("description")}
        onRetry={onRetry}
        retryLabel={tErrors("retry")}
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={EmptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">{children}</div>
      {totalPages > 1 && (
        <PaginationBar
          currentPage={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
          ariaLabel={t("board.pagination")}
          prevLabel={t("board.prev")}
          nextLabel={t("board.next")}
        />
      )}
    </div>
  );
}
