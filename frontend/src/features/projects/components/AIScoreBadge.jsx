"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils";

/** Tier thresholds per ui-ux-design-prompt-v2.md §5: danger → warning → success → primary-600 */
export function getScoreTier(score) {
  if (score < 40) return "weak";
  if (score < 60) return "medium";
  if (score < 80) return "good";
  return "excellent";
}

const tierClasses = {
  weak: {
    badge: "bg-tint-danger text-danger-ink",
    dot: "bg-danger",
    ring: "text-danger border-danger/40",
  },
  medium: {
    badge: "bg-tint-warning text-warning-ink",
    dot: "bg-warning",
    ring: "text-warning border-warning/40",
  },
  good: {
    badge: "bg-tint-success text-success-ink",
    dot: "bg-success",
    ring: "text-success border-success/40",
  },
  excellent: {
    badge: "bg-accent-100 text-primary-600",
    dot: "bg-primary-600",
    ring: "text-primary-600 border-primary-600/40",
  },
};

export function AIScoreBadge({
  score,
  showLabel = true,
  ring = false,
  className,
}) {
  const t = useTranslations("projects");
  const tier = getScoreTier(score);
  const styles = tierClasses[tier];

  if (ring) {
    return (
      <span
        className={cn(
          "inline-flex h-20 w-20 items-center justify-center rounded-full border-4 bg-surface-0 shadow-md",
          styles.ring,
          className
        )}
        title={`AI Score: ${score}/100`}
      >
        <span className="font-heading text-xl font-bold">{score}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        styles.badge,
        className
      )}
      title={`AI Score: ${score}/100`}
    >
      <span aria-hidden className={cn("h-2 w-2 rounded-full", styles.dot)} />
      {t("aiScore")}: {score}
      {showLabel && (
        <span className="opacity-80">
          · {t(`scoreTiers.${tier}`)}
        </span>
      )}
    </span>
  );
}
