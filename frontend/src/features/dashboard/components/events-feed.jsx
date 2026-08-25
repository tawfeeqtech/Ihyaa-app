"use client";

import { ArrowRight, CalendarBlank, Handshake } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Link } from "@/config/i18n/link";
import { RelativeTime } from "@/features/notifications/components/RelativeTime";
import { cn } from "@/shared/utils";
import { feedTypeMeta } from "../data/feed-types";

/**
 * EPIC-10 · Events feed widget (US-053 · T063) — dashboard-api.md §1.feed.
 *
 * Renders the last 10 owner events (from the dashboard aggregate): the mapped
 * feed type, related project title (falls back to the notification title), a
 * relative RTL time («قبل 5 دقائق»), and a link to the related item. The
 * «عرض كل الأحداث» button opens the paginated /events page (US-053/2).
 *
 * Client component (Phosphor icons + RelativeTime); labels from the `dashboard`
 * namespace.
 */

function eventHref(event) {
  if (event.action_url) return event.action_url;
  if (event.related_project?.id) return `/projects/${event.related_project.id}`;
  return "/notifications";
}

export function EventsFeed({ items, hasMore = false, className }) {
  const t = useTranslations("dashboard");
  const list = Array.isArray(items) ? items : [];

  if (list.length === 0) {
    return (
      <section className={cn("rounded-xl border border-border bg-surface-1 p-5 shadow-sm", className)}>
        <SectionTitle />
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-100">
            <Handshake size={28} weight="light" className="text-primary-600" aria-hidden />
          </span>
          <p className="font-heading font-semibold text-text-primary">{t("owner.feed.empty")}</p>
          <p className="max-w-sm text-sm text-text-secondary">{t("owner.feed.emptyDesc")}</p>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("rounded-xl border border-border bg-surface-1 shadow-sm", className)}>
      <SectionTitle />
      <ul className="divide-y divide-border/60">
        {list.map((event) => {
          const meta = feedTypeMeta(event.type);
          const Icon = meta.icon;
          const projectTitle =
            event.related_project?.title ?? (event.title ?? "");
          const href = eventHref(event);
          return (
            <li key={event.id}>
              <Link
                href={href}
                className="flex items-start gap-3 p-4 transition-colors hover:bg-surface-0/70"
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    meta.classes
                  )}
                  aria-hidden
                >
                  <Icon size={20} weight="duotone" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-text-primary">
                    {projectTitle}
                  </span>
                  {event.body && (
                    <span className="mt-0.5 block line-clamp-1 text-xs text-text-secondary">
                      {event.body}
                    </span>
                  )}
                  <span className="mt-1 flex items-center gap-1 text-xs text-text-secondary/80">
                    <CalendarBlank size={12} aria-hidden />
                    <RelativeTime date={event.created_at} />
                  </span>
                </span>
                <span
                  className="mt-2 shrink-0 text-text-secondary/70 rtl:rotate-180"
                  aria-hidden
                >
                  <ArrowRight size={16} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {hasMore && (
        <div className="border-t border-border p-4">
          <Link
            href="/events"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface-0 px-4 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-1 sm:w-auto"
          >
            <CalendarBlank size={16} aria-hidden />
            {t("owner.feed.viewAll")}
            <span className="rtl:rotate-180" aria-hidden>
              <ArrowRight size={16} />
            </span>
          </Link>
        </div>
      )}
    </section>
  );
}

function SectionTitle() {
  const t = useTranslations("dashboard");
  return (
    <h2 className="flex items-center gap-2 border-b border-border px-4 py-3 font-heading text-base font-bold text-text-primary">
      <CalendarBlank size={18} className="text-primary-600" aria-hidden />
      {t("owner.feed.title")}
    </h2>
  );
}
