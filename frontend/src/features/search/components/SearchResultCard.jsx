"use client";

import { Eye } from "@phosphor-icons/react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Link } from "@/config/i18n/link";
import { sectorLabels, statusLabels } from "@/features/projects/data/projects";
import { AIScoreBadge } from "@/features/projects/components/AIScoreBadge";
import { initials, sanitizeHighlightHtml } from "@/shared/utils";

/**
 * A single search hit (US-030 / US-032 / US-033).
 *
 * Renders the shape returned by GET /api/search `data.hits` (search-api.md §1):
 * title (with Meilisearch `<em>` highlight from `_formatted.title`),
 * description_snippet, category → sector label, tags, status, overall_score
 * (AIScoreBadge), views_count, created_at and cover_image_url when present.
 */
export function SearchResultCard({ hit }) {
  const t = useTranslations("search");
  const locale = useLocale();
  const format = useFormatter();

  const id = String(hit.id);
  const title = hit._formatted?.title ?? hit.title ?? "";
  const description = hit.description_snippet ?? hit.description ?? "";
  const sector = sectorLabels[hit.category] ?? sectorLabels.other;
  const sectorText = locale === "ar" ? sector.ar : sector.en;
  const status = statusLabels[hit.status] ?? statusLabels.needs_funding;
  const statusText = locale === "ar" ? status.ar : status.en;
  const hasScore = Boolean(hit.has_score && hit.overall_score != null);

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface-1 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:shadow-primary-600/10">
      <Link href={`/projects/${id}`} className="flex flex-1 flex-col">
        {/* Cover */}
        <div className="relative h-40 overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-primary-600">
          {hit.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hit.cover_image_url}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <>
              <div className="pointer-events-none absolute inset-0 pattern-islamic" aria-hidden />
              <span
                aria-hidden
                className="absolute inset-0 flex items-center justify-center font-heading text-6xl font-bold text-white/25"
              >
                {initials(title)}
              </span>
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-primary-600/50 to-transparent" />
          {hasScore && (
            <div className="absolute start-3 top-3">
              <AIScoreBadge score={Math.round(hit.overall_score)} />
            </div>
          )}
          <span className="absolute bottom-3 end-3 rounded-md bg-surface-0/90 px-2 py-0.5 text-xs font-medium text-text-primary shadow-sm">
            {sectorText}
          </span>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-3 p-5">
          {/* Meilisearch highlights match in <em> — keep only that tag, strip
              attributes and neutralise stray markup (XSS guard). */}
          {title.includes("<em>") ? (
            <h3
              className="font-heading text-lg font-semibold text-text-primary transition-colors group-hover:text-primary-600"
              dangerouslySetInnerHTML={{ __html: sanitizeHighlightHtml(title) }}
            />
          ) : (
            <h3 className="font-heading text-lg font-semibold text-text-primary transition-colors group-hover:text-primary-600">
              {title}
            </h3>
          )}

          <p className="line-clamp-2 text-sm text-text-secondary">{description}</p>

          {hit.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {hit.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-accent-100 px-2.5 py-1 text-xs font-medium text-primary-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
            <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: statusColor(hit.status),
                }}
              />
              {statusText}
            </span>
            <div className="flex items-center gap-3 text-xs text-text-secondary">
              <span className="inline-flex items-center gap-1">
                <Eye size={14} aria-hidden />
                {format.number(hit.views_count ?? 0)}
              </span>
              {hit.created_at && (
                <time dateTime={hit.created_at} className="text-xs text-text-secondary">
                  {format.dateTime(new Date(hit.created_at), { dateStyle: "medium" })}
                </time>
              )}
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}

/** Status dot colour — mirrors statusLabels semantics (completed/success, others/warning). */
function statusColor(status) {
  switch (status) {
    case "completed":
      return "var(--color-success)";
    case "needs_funding":
      return "var(--color-warning)";
    default:
      return "var(--color-primary-600)";
  }
}
