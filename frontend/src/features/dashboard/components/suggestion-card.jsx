"use client";

import { BookmarkSimple, CheckCircle, TrendUp } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/config/i18n/link";
import { statusLabels } from "@/features/projects/data/projects";
import { cn, initials } from "@/shared/utils";

/**
 * EPIC-11 · Investor suggestion card (US-056 · T082) — dashboard-api.md §2.suggestions.
 *
 * الدستور I — Level 1 only: title, image, sector, score, status. No dimension
 * scores, no description, no owner. An `engagement_badge` ("sent" | "saved")
 * renders "تم إرسال طلب" / "محفوظ" — the project is NOT excluded nor repeated
 * (US-056/5).
 */

const STATUS_META = {
  completed: { classes: "bg-tint-success text-success-ink" },
  needs_development: { classes: "bg-tint-warning text-warning-ink" },
  needs_funding: { classes: "bg-accent-100 text-primary-600" },
};

const BADGE_META = {
  sent: {
    key: "badgeInterestSent",
    classes: "bg-tint-success text-success-ink",
    icon: CheckCircle,
  },
  saved: {
    key: "badgeSaved",
    classes: "bg-accent-100 text-primary-600",
    icon: BookmarkSimple,
  },
};

export function SuggestionCard({ suggestion, className }) {
  const t = useTranslations("dashboard");
  const locale = useLocale();

  const title = suggestion?.title ?? "—";
  const category = suggestion?.category ?? null;
  const statusMeta = STATUS_META[suggestion?.status] ?? null;
  const cover = suggestion?.cover_image_url ?? null;
  const score = typeof suggestion?.ai_score === "number" ? suggestion.ai_score : null;
  const badgeMeta = BADGE_META[suggestion?.engagement_badge] ?? null;

  return (
    <Link
      href={`/projects/${suggestion.id}`}
      data-testid="suggestion-card"
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border border-border bg-surface-1 shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary-600/10",
        className
      )}
    >
      {/* Cover / gradient placeholder */}
      <div className="relative h-32 overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-primary-600">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <>
            <div className="pointer-events-none absolute inset-0 pattern-islamic" aria-hidden />
            <span
              aria-hidden
              className="absolute inset-0 flex items-center justify-center font-heading text-4xl font-bold text-white/25"
            >
              {initials(title)}
            </span>
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-primary-600/50 to-transparent" aria-hidden />

        {statusMeta && (
          <span
            className={cn(
              "absolute start-3 top-3 rounded-full px-2.5 py-0.5 text-[11px] font-semibold shadow-sm",
              statusMeta.classes
            )}
          >
            {locale === "ar"
              ? statusLabels[suggestion.status]?.ar ?? suggestion.status
              : statusLabels[suggestion.status]?.en ?? suggestion.status}
          </span>
        )}

        {badgeMeta && (
          <span
            className={cn(
              "absolute end-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold shadow-sm",
              badgeMeta.classes
            )}
          >
            <badgeMeta.icon size={12} weight="bold" aria-hidden />
            {t(`investor.${badgeMeta.key}`)}
          </span>
        )}
      </div>

      {/* Body — Level 1 */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-heading text-base font-semibold text-text-primary transition-colors group-hover:text-primary-600">
          {title}
        </h3>
        {category && <p className="text-xs text-text-secondary">{category}</p>}

        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <span className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-accent-100/70 px-3 text-primary-700">
            <TrendUp size={16} weight="duotone" aria-hidden />
            <span className="font-heading text-lg font-bold">{score ?? "—"}</span>
          </span>
          <span className="text-xs text-text-secondary">{t("investor.score")}</span>
        </div>
      </div>
    </Link>
  );
}
