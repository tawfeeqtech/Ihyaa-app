"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/config/i18n/link";
import { ErrorState } from "@/shared/components/EmptyState";

/**
 * Server-rendered project detail can't hold interactive state, so a failed
 * network fetch (non-404) renders this client widget. The retry action calls
 * `router.refresh()`, which re-runs the server component and re-attempts the
 * fetch — a genuine network failure is shown as an error, never as a 404.
 */
export function ProjectLoadError() {
  const t = useTranslations("errors");
  const router = useRouter();

  return (
    <ErrorState
      title={t("title")}
      description={t("description")}
      onRetry={() => router.refresh()}
      retryLabel={t("retry")}
    />
  );
}
