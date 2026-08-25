"use client";

import {
  ArrowCounterClockwise,
  ChartLineUp,
  CircleNotch,
  FolderOpen,
  Lightning,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Link } from "@/config/i18n/link";
import { cn, initials } from "@/shared/utils";

/**
 * EPIC-10 · Project mini-card (US-051 · T052/T054) — dashboard-api.md §1.projects.
 *
 * الدستور II — لا بطاقة بلا حالة AI: each card carries one of the four
 * evaluation states (completed / processing / failed / null). The card links to
 * the project detail page; the AI-state area links to the AI report
 * (/projects/{id}/analysis). A failed evaluation surfaces a retry link (SRS-AI-E03)
 * back to the detail page where the owner can re-trigger.
 *
 * Client component (Phosphor icons are client-only in this app); labels come
 * from the `dashboard` namespace.
 */

const STATUS_META = {
  draft: { key: "badgeDraft", classes: "bg-tint-warning text-warning-ink" },
  published: { key: "badgePublished", classes: "bg-accent-100 text-primary-600" },
  archived: { key: "badgeArchived", classes: "bg-surface-2 text-text-secondary" },
};

export function ProjectMiniCard({ project, className }) {
  const t = useTranslations("dashboard");
  const title = project.title ?? "—";
  const category = project.category ?? null;
  const status = STATUS_META[project.status] ?? null;
  const cover = project.cover_image_url ?? null;
  const state = project.evaluation_status; // completed | processing | failed | null

  return (
    <Link
      href={`/projects/${project.id}`}
      data-testid="project-mini-card"
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border border-border bg-surface-1 shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary-600/10",
        className
      )}
    >
      {/* Cover / gradient placeholder */}
      <div className="relative h-28 overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-primary-600">
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
        {status && (
          <span
            className={cn(
              "absolute start-3 top-3 rounded-full px-2.5 py-0.5 text-[11px] font-semibold shadow-sm",
              status.classes
            )}
          >
            {t(`owner.${status.key}`)}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-heading text-base font-semibold text-text-primary transition-colors group-hover:text-primary-600">
          {title}
        </h3>
        {category && <p className="text-xs text-text-secondary">{category}</p>}

        <div className="mt-auto pt-2">
          <AiStateArea project={project} state={state} t={t} />
        </div>
      </div>
    </Link>
  );
}

/** The four AI evaluation states (الدستور II). */
function AiStateArea({ project, state, t }) {
  const base = "flex min-h-11 items-center gap-2 rounded-lg px-3 py-2";

  // completed — the ai_score is prominent and links to the AI report.
  if (state === "completed") {
    const score = project.ai_score;
    return (
      <Link
        href={`/projects/${project.id}/analysis`}
        aria-label={t("owner.viewReport")}
        className={cn(base, "bg-accent-100/70 text-primary-700 transition-colors hover:bg-accent-100")}
      >
        <ChartLineUp size={18} weight="duotone" aria-hidden />
        <span className="font-heading text-lg font-bold">{score ?? "—"}</span>
        <span className="text-xs font-medium">{t("owner.aiState.completed")}</span>
      </Link>
    );
  }

  // processing — "جاري التقييم".
  if (state === "processing") {
    return (
      <div className={cn(base, "bg-surface-2 text-text-secondary")}>
        <CircleNotch size={18} className="animate-spin" aria-hidden />
        <span className="text-sm font-medium">{t("owner.aiState.processing")}</span>
      </div>
    );
  }

  // failed — "فشل التقييم" + retry link (SRS-AI-E03).
  if (state === "failed") {
    return (
      <div className={cn(base, "bg-tint-danger/60 text-danger")}>
        <Lightning size={18} weight="duotone" aria-hidden />
        <span className="text-sm font-medium">{t("owner.aiState.failed")}</span>
        <Link
          href={`/projects/${project.id}`}
          className="ms-auto inline-flex items-center gap-1 rounded-md bg-surface-0/80 px-2 py-1 text-xs font-semibold text-danger-ink transition-colors hover:bg-surface-0"
        >
          <ArrowCounterClockwise size={14} weight="bold" aria-hidden />
          {t("owner.aiState.retry")}
        </Link>
      </div>
    );
  }

  // null — "غير مقيَّم".
  return (
    <div className={cn(base, "bg-surface-2 text-text-secondary")}>
      <FolderOpen size={18} aria-hidden />
      <span className="text-sm font-medium">{t("owner.aiState.null")}</span>
    </div>
  );
}
