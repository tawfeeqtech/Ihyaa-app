"use client";

import { BookmarkSimple, Compass, Trash } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/config/i18n/link";
import { RelativeTime } from "@/features/notifications/components/RelativeTime";
import { statusLabels } from "@/features/projects/data/projects";
import { unsaveProject } from "@/features/projects/lib/saved-projects";
import { cn, initials } from "@/shared/utils";
import { useToast } from "@/shared/components/Toast";

/**
 * EPIC-11 · Saved-projects widget (US-059 · T095/T096) — dashboard-api.md §2.saved_projects.
 *
 * Level-1 cards (title, image, category, status, score) with a relative saved
 * time and a one-click remove (no dialog). A soft-deleted project stays in the
 * list with the «هذا المشروع غير متاح حالياً» badge and no link (US-059/6).
 * The zero state invites the investor to browse projects.
 *
 * الدستور I — Level 1 only, no dimension scores. الدستور III — RTL via next-intl.
 */

const STATUS_META = {
  completed: { classes: "bg-tint-success text-success-ink" },
  needs_development: { classes: "bg-tint-warning text-warning-ink" },
  needs_funding: { classes: "bg-accent-100 text-primary-600" },
};

export function SavedProjectsList({ items, onRemoved, className }) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const toast = useToast();
  const list = Array.isArray(items) ? items : [];

  if (list.length === 0) {
    return (
      <section className={cn("rounded-xl border border-border bg-surface-1 shadow-sm", className)}>
        <SectionTitle />
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-100">
            <BookmarkSimple size={28} weight="light" className="text-primary-600" aria-hidden />
          </span>
          <p className="font-heading font-semibold text-text-primary">
            {t("investor.savedProjectsEmpty")}
          </p>
          <p className="max-w-sm text-sm text-text-secondary">
            {t("investor.savedProjectsEmptyDesc")}
          </p>
          <Link
            href="/projects"
            className="mt-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            <Compass size={18} weight="bold" aria-hidden />
            {t("investor.savedBrowse")}
          </Link>
        </div>
      </section>
    );
  }

  async function remove(row) {
    try {
      await unsaveProject(row.project?.id ?? row.project_id);
      toast.success(t("investor.savedRemoved"));
      onRemoved?.(row.saved_id ?? row.project?.id);
    } catch (err) {
      toast.error(err.body?.message ?? t("investor.savedRemovedFailed"));
    }
  }

  return (
    <section className={cn("rounded-xl border border-border bg-surface-1 shadow-sm", className)}>
      <SectionTitle />
      <ul className="divide-y divide-border/60">
        {list.map((row) => {
          const project = row.project ?? {};
          const available = project.available !== false;
          const statusMeta = STATUS_META[project.status] ?? null;
          const cover = project.cover_image_url ?? null;
          const score = typeof project.ai_score === "number" ? project.ai_score : null;

          const body = (
            <>
              <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-primary-600 via-primary-500 to-primary-600 sm:w-28">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center font-heading text-xl font-bold text-white/25"
                  >
                    {initials(project.title ?? "—")}
                  </span>
                )}
                {!available && (
                  <span
                    className="absolute inset-0 flex items-center justify-center bg-black/45 px-2 text-center text-[10px] font-semibold leading-tight text-white"
                  >
                    {t("investor.unavailableBadge")}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="line-clamp-1 font-heading font-semibold text-text-primary">
                    {project.title ?? "—"}
                  </span>
                  {statusMeta && (
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                        statusMeta.classes
                      )}
                    >
                      {locale === "ar"
                        ? statusLabels[project.status]?.ar ?? project.status
                        : statusLabels[project.status]?.en ?? project.status}
                    </span>
                  )}
                </div>
                {project.category && (
                  <p className="mt-0.5 text-xs text-text-secondary">{project.category}</p>
                )}
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-text-secondary/80">
                  <BookmarkSimple size={12} weight="fill" aria-hidden />
                  <RelativeTime date={row.saved_at} />
                </p>
              </div>

              <span className="flex shrink-0 items-center gap-2">
                {score !== null && (
                  <span className="inline-flex min-h-9 items-center rounded-lg bg-accent-100/70 px-3 font-heading text-base font-bold text-primary-700">
                    {score}
                  </span>
                )}
                <button
                  type="button"
                  aria-label={t("investor.removeSaved")}
                  title={t("investor.removeSaved")}
                  onClick={(event) => {
                    // The button sits inside a project <Link> — keep the click
                    // from bubbling into navigation (US-059 one-click remove).
                    event.preventDefault();
                    event.stopPropagation();
                    void remove(row);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:border-danger/40 hover:bg-tint-danger/50 hover:text-danger"
                >
                  <Trash size={18} weight="bold" aria-hidden />
                </button>
              </span>
            </>
          );

          return (
            <li key={row.saved_id ?? row.id} className="p-4">
              {available ? (
                <Link
                  href={`/projects/${project.id}`}
                  data-testid="saved-project-row"
                  className="flex items-center gap-4 rounded-lg transition-colors hover:bg-surface-0/70"
                >
                  {body}
                </Link>
              ) : (
                <div
                  data-testid="saved-project-row"
                  className="flex items-center gap-4 rounded-lg opacity-80"
                >
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SectionTitle() {
  const t = useTranslations("dashboard");
  return (
    <h2 className="flex items-center gap-2 border-b border-border px-4 py-3 font-heading text-base font-bold text-text-primary">
      <BookmarkSimple size={18} className="text-primary-600" aria-hidden />
      {t("investor.savedProjectsTitle")}
    </h2>
  );
}
