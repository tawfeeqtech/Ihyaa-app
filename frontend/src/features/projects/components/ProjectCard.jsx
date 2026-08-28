"use client";

import { Bookmark, BookmarkSimple, Eye } from "@phosphor-icons/react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/config/i18n/link";
import { sectorLabels, statusLabels } from "@/features/projects/data/projects";
import { AIScoreBadge } from "./AIScoreBadge";
import { avatarHue, initials } from "@/shared/utils";
import { useToast } from "@/shared/components/Toast";
import { useAuth } from "@/features/auth";
import { useSavedStatus } from "@/features/projects/hooks/use-saved-status";

/**
 * Solid card (no glassmorphism) with soft shadows, AI score badge,
 * sector tags on accent-100 and the owner row.
 */
export function ProjectCard({ project, noBookmark = false }) {
  const t = useTranslations("projects");
  const locale = useLocale();
  const format = useFormatter();
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const router = useRouter();
  // Real saved status (EPIC-11 · US-059). When the card hides the bookmark
  // (`noBookmark`), the hook is a no-op — it skips the saved-list fetch.
  const { saved, toggle } = useSavedStatus(project.id, {
    authed: isAuthenticated && !noBookmark,
  });

  const title = locale === "ar" ? project.title.ar : project.title.en;
  const description = locale === "ar" ? project.description.ar : project.description.en;
  const sector = sectorLabels[project.sector];
  const sectorText = locale === "ar"
    ? (sector?.ar ?? project.sector)
    : (sector?.en ?? project.sector);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface-1 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:shadow-primary-600/10">
      {/* Cover */}
      <Link href={`/projects/${project.id}`} aria-label={title} className="block">
        <div className="relative h-40 overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-primary-600">
          <div className="pointer-events-none absolute inset-0 pattern-islamic" aria-hidden />
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center font-heading text-6xl font-bold text-white/25"
          >
            {initials(title)}
          </span>
          <div className="absolute inset-0 bg-gradient-to-t from-primary-600/60 to-transparent transition-opacity duration-300 group-hover:opacity-70" />
          <div className="absolute start-3 top-3">
            <AIScoreBadge score={project.aiScore} />
          </div>
          <span className="absolute bottom-3 end-3 rounded-md bg-surface-0/90 px-2 py-0.5 text-xs font-medium text-text-primary shadow-sm">
            {sectorText}
          </span>
        </div>
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <Link href={`/projects/${project.id}`}>
          <h3 className="font-heading text-lg font-semibold text-text-primary transition-colors group-hover:text-primary-600">
            {title}
          </h3>
        </Link>
        <p className="line-clamp-2 text-sm text-text-secondary">{description}</p>

        <div className="flex flex-wrap gap-1.5" aria-label={t("tagsLabel")}>
          {project.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-accent-100 px-2.5 py-1 text-xs font-medium text-primary-600"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: avatarHue(project.owner.name) }}
            >
              {initials(project.owner.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">
                {project.owner.name}
              </p>
              <p className="text-xs text-text-secondary">
                {t("status", { status: locale === "ar" ? (statusLabels[project.status]?.ar ?? project.status) : (statusLabels[project.status]?.en ?? project.status) })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-text-secondary">
            <Eye size={14} aria-hidden />
            <span>{format.number(project.views)}</span>
            {!noBookmark && (
              <button
                type="button"
                onClick={() => {
                  if (!isAuthenticated) {
                    toast.info(t("detail.loginRequired"));
                    router.push("/login");
                    return;
                  }
                  toggle();
                }}
                aria-pressed={saved}
                aria-label={saved ? t("removeSaved") : t("saveProject")}
                className="ms-1 flex h-12 w-12 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-accent-100 hover:text-primary-600"
              >
                {saved ? (
                  <BookmarkSimple size={18} weight="fill" className="text-primary-600" />
                ) : (
                  <Bookmark size={18} />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
