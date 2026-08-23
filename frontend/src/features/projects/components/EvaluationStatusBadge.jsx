"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowClockwise,
  CheckCircle,
  Hourglass,
  WarningCircle,
} from "@phosphor-icons/react";
import { Button } from "@/shared/components/Button";
import { useToast } from "@/shared/components/Toast";
import { cn } from "@/shared/utils";
import { useEvaluationStatus } from "../hooks/useEvaluationStatus";

const MINUTE_MS = 60 * 1000;

/** Convert a remaining duration to { hours, minutes } (T077 countdown). */
function toHoursMinutes(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / MINUTE_MS));
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
}

/**
 * EvaluationStatusBadge — live evaluation status, progress, failure+retry and
 * the 24h cooldown countdown (T052 · T073 · T077).
 *
 * Polls GET /evaluation-status every 10s while the run is pending/processing
 * (via `useEvaluationStatus`) and auto-updates without a page reload.
 *
 * @param {Object} props
 * @param {string|number} props.projectId
 * @param {number} [props.refreshSignal] Bump to force an immediate refetch
 *   (used after a re-evaluate is queued so the badge picks up the new run).
 * @param {(statusKey: string, status: Object) => void} [props.onStatusChange]
 *   Called when the run reaches a terminal state (completed/partial/failed).
 */
export function EvaluationStatusBadge({
  projectId,
  refreshSignal = 0,
  onStatusChange,
  className,
}) {
  const t = useTranslations("projects");
  const toast = useToast();
  const { status, retrying, retry } = useEvaluationStatus(projectId, {
    enabled: !!projectId,
    refreshSignal,
  });

  // Tick the cooldown countdown every 30s while a cooldown is active (T077).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!status?.next_evaluation_at) return;
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [status?.next_evaluation_at]);

  // Notify the parent on a terminal transition so it can refresh the report
  // (T052 "auto-update without reload").
  const statusKey = status?.status ?? null;
  useEffect(() => {
    if (statusKey === "completed" || statusKey === "partial" || statusKey === "failed") {
      onStatusChange?.(statusKey, status);
    }
  }, [statusKey, status, onStatusChange]);

  // Nothing meaningful to show yet.
  if (!status || status.status === "never_evaluated") return null;

  const active = status.status === "pending" || status.status === "processing";

  const progress = status.progress ?? {};
  const done = progress.completed_dimensions ?? 0;
  const total = progress.total_dimensions ?? 5;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // Cooldown countdown (T077) — shown whenever next_evaluation_at is in the future.
  const nextAt = status.next_evaluation_at
    ? new Date(status.next_evaluation_at).getTime()
    : null;
  const cooldownMs = nextAt ? nextAt - now : 0;
  const showCooldown = cooldownMs > 0;
  const cooldown = toHoursMinutes(cooldownMs);

  const handleRetry = async () => {
    try {
      await retry();
      toast.success(t("report.retryQueued"));
    } catch (err) {
      toast.error(err?.body?.message ?? t("report.retryFailed"));
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Active run — spinner + progress (T052) */}
      {active && (
        <div className="flex items-center gap-3 rounded-xl border border-primary-600/30 bg-accent-100 px-4 py-3" role="status" aria-live="polite">
          <Hourglass size={20} weight="bold" className="shrink-0 animate-spin text-primary-600" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-primary-600">{t("report.statusProcessing")}</p>
            <p className="mt-0.5 text-xs text-text-secondary">
              {t("report.statusProcessingProgress", { done, total })}
            </p>
            <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-primary-600/15">
              <div
                className="h-full rounded-full bg-primary-600 transition-[width] duration-500"
                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Failed run — clear error message + retry (T073 · SRS-AI-E03) */}
      {status.status === "failed" && (
        <div className="flex items-start gap-3 rounded-xl border border-danger/40 bg-tint-danger px-4 py-3" role="alert">
          <WarningCircle size={20} weight="bold" className="mt-0.5 shrink-0 text-danger" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-danger-ink">{t("report.statusFailed")}</p>
            <p className="mt-0.5 text-sm text-danger-ink/90">
              {status.error_summary ?? t("report.statusFailedHint")}
            </p>
            {status.can_retry && (
              <Button size="sm" className="mt-3" loading={retrying} onClick={handleRetry}>
                <ArrowClockwise size={16} weight="bold" aria-hidden />
                {t("report.retry")}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Partial run — treated as completed with warnings (SRS-AI-E04) */}
      {status.status === "partial" && (
        <div className="flex items-center gap-3 rounded-xl border border-warning/40 bg-tint-warning px-4 py-3" role="note">
          <CheckCircle size={20} weight="bold" className="shrink-0 text-warning" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-warning-ink">{t("report.statusPartial")}</p>
            <p className="mt-0.5 text-xs text-warning-ink/90">
              {t("report.statusPartialHint", { done, total })}
            </p>
          </div>
        </div>
      )}

      {/* 24h cooldown countdown (T077) */}
      {showCooldown && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-1 px-4 py-3 text-sm">
          <Hourglass size={18} className="shrink-0 text-text-secondary" aria-hidden />
          <p className="text-text-primary">
            {t("report.reevalCooldown", {
              hours: cooldown.hours,
              minutes: cooldown.minutes,
            })}
          </p>
        </div>
      )}
    </div>
  );
}
