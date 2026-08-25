"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarBlank } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Link } from "@/config/i18n/link";
import { EmptyState } from "@/shared/components/EmptyState";
import PaginationBar from "@/shared/components/PaginationBar";
import { PullToRefresh } from "@/shared/components/PullToRefresh";
import { RelativeTime } from "@/features/notifications/components/RelativeTime";
import {
  fetchNotifications,
  mapApiNotification,
  NOTIFICATIONS_PAGE_SIZE,
} from "@/features/notifications/lib/notifications";
import { useToast } from "@/shared/components/Toast";
import { cn } from "@/shared/utils";
import { feedTypeMeta } from "../data/feed-types";
import { useCriticalEvents } from "../hooks/use-critical-events";

/**
 * EPIC-10 · Events list (US-053/2 · T064/T065) — GET /api/notifications, 20/page.
 *
 * The full, paginated activity log for the owner. Raw notification types are
 * normalized through the shared feed-type catalogue (feed-types.js) so icons,
 * tints and labels match the dashboard feed widget. The `/events` server page
 * renders the header; this client widget owns the list state.
 *
 * T065 — realtime critical events (broadcast over Reverb) are merged at the top
 * without a reload, de-duplicated against the paginated page.
 */

export function EventsList() {
  const t = useTranslations("events");
  const toast = useToast();

  const realtime = useCriticalEvents();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchNotifications({ page, perPage: NOTIFICATIONS_PAGE_SIZE });
      setItems((res?.data ?? []).map(mapApiNotification));
      setTotalPages(res?.meta?.last_page ?? 1);
    } catch (err) {
      toast.error(err.body?.message ?? t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [page, toast, t]);

  useEffect(() => {
    load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  // Real-time critical events at the top, de-duplicated against the loaded page.
  const merged = [
    ...realtime.filter((r) => !items.some((i) => i.id === r.id)),
    ...items,
  ];

  return (
    <PullToRefresh onRefresh={load}>
      <div className="space-y-6">
        {loading ? (
          <div className="space-y-3" aria-busy>
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl border border-border bg-surface-1"
              />
            ))}
          </div>
        ) : merged.length === 0 ? (
          <EmptyState
            icon={CalendarBlank}
            title={t("empty")}
            description={t("emptyDesc")}
          />
        ) : (
          <ul className="space-y-3">
            {merged.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <PaginationBar
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            ariaLabel={t("pagination")}
            prevLabel={t("prev")}
            nextLabel={t("next")}
          />
        )}
      </div>
    </PullToRefresh>
  );
}

function eventHref(event) {
  if (event.url) return event.url;
  if (event.data?.related_project?.id) return `/projects/${event.data.related_project.id}`;
  return "/notifications";
}

function EventRow({ event }) {
  const t = useTranslations("events");
  const meta = feedTypeMeta(event.type);
  const Icon = meta.icon;
  const href = eventHref(event);
  const title = event.title || t("genericTitle");

  return (
    <li>
      <Link
        href={href}
        className={cn(
          "flex w-full items-start gap-3 rounded-xl border p-4 text-start shadow-sm transition-colors hover:bg-surface-1",
          "border-border bg-surface-1/60"
        )}
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
          <span className="flex items-start justify-between gap-2">
            <span className="min-w-0 flex-1">
              <span className="block font-heading text-sm font-semibold text-text-primary">
                {title}
              </span>
              {event.body && (
                <span className="mt-0.5 block text-sm text-text-secondary">{event.body}</span>
              )}
            </span>
            <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
              {t(`types.${meta.key}`)}
            </span>
          </span>
          <RelativeTime
            date={event.created_at}
            className="mt-1 block text-xs text-text-secondary/80"
          />
        </span>

        {event.is_critical && (
          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-600" aria-hidden />
        )}
      </Link>
    </li>
  );
}
