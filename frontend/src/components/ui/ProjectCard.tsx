"use client";

import { useState } from "react";
import { Bookmark, BookmarkSimple, Eye } from "@phosphor-icons/react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/i18n";
import type { Project } from "@/lib/mock-data";
import { sectorLabels, statusLabels } from "@/lib/mock-data";
import { AIScoreBadge } from "./AIScoreBadge";
import { avatarHue, initials } from "@/lib/utils";

interface ProjectCardProps {
  project: Project;
  /** Hide the bookmark (e.g. on the owner's own dashboard). */
  noBookmark?: boolean;
}

/**
 * Solid card (no glassmorphism) with soft shadows, AI score badge,
 * sector tags on accent-100 and the owner row.
 */
export function ProjectCard({ project, noBookmark = false }: ProjectCardProps) {
  const t = useTranslations("projects");
  const locale = useLocale();
  const format = useFormatter();
  const [saved, setSaved] = useState(false);

  const title = locale === "ar" ? project.title.ar : project.title.en;
  const description = locale === "ar" ? project.description.ar : project.description.en;
  const sector = sectorLabels[project.sector];
  const sectorText = locale === "ar" ? sector.ar : sector.en;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface-1 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:shadow-primary-600/10">
      {/* Cover */}
      <Link href={`/projects/${project.id}`} aria-label={title} className="block">
        <div className="relative h-40 overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-primary-600 pattern-islamic">
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
                {t("status", { status: locale === "ar" ? statusLabels[project.status].ar : statusLabels[project.status].en })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-text-secondary">
            <Eye size={14} aria-hidden />
            <span>{format.number(project.views)}</span>
            {!noBookmark && (
              <button
                type="button"
                onClick={() => setSaved((s) => !s)}
                aria-pressed={saved}
                aria-label={saved ? t("removeSaved") : t("saveProject")}
                className="ms-1 flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-accent-100 hover:text-primary-600"
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
