"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BellSlash,
  CheckCircle,
  Checks,
  ChartLine,
  Handshake,
  Info,
  Prohibit,
  Sparkle,
  XCircle,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/config/i18n/link";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import PaginationBar from "@/shared/components/PaginationBar";
import { PullToRefresh } from "@/shared/components/PullToRefresh";
import { RelativeTime } from "@/features/notifications/components/RelativeTime";
import { useUnreadCount } from "@/features/notifications/hooks/useUnreadCount";
import {
  fetchNotifications,
  mapApiNotification,
  NOTIFICATIONS_PAGE_SIZE,
} from "@/features/notifications/lib/notifications";
import { useToast } from "@/shared/components/Toast";
import { cn } from "@/shared/utils";

/**
 * EPIC-09 · Notifications page (T071 · US-047) — full list, 20/page.
 *
 * Shows every notification (critical + non-critical — the DB is the single
 * source of truth, US-049) with its type, entity link, relative RTL time and
 * read state. A «mark all read» action flushes the unread badge (T070). The
 * page is wrapped in PullToRefresh so pulling down re-fetches (T078).
 */

const TYPE_ICON = {
  interest_new: Handshake,
  interest_accepted: CheckCircle,
  interest_rejected: XCircle,
  interest_cancelled: Prohibit,
  evaluation_completed: ChartLine,
  analysis_completed: Sparkle,
};

const TYPE_COLOR = {
  interest_new: "bg-accent-100 text-primary-600",
  interest_accepted: "bg-tint-success text-success",
  interest_rejected: "bg-tint-danger text-danger",
  interest_cancelled: "bg-surface-2 text-text-secondary",
  evaluation_completed: "bg-accent-100 text-primary-600",
  analysis_completed: "bg-tint-success text-success",
};

export default function NotificationsPage() {
  const t = useTranslations("notifications");
  const toast = useToast();
  const router = useRouter();
  const { markRead, markAllRead } = useUnreadCount();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchNotifications({ page, perPage: NOTIFICATIONS_PAGE_SIZE });
      setItems((res?.data ?? []).map(mapApiNotification));
      setTotalPages(res?.meta?.last_page ?? 1);
      setUnreadCount(res?.meta?.unread_count ?? 0);
    } catch (err) {
      toast.error(err.body?.message ?? t("page.loadError"));
    } finally {
      setLoading(false);
    }
  }, [page, toast, t]);

  useEffect(() => {
    load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  function handleRowClick(n) {
    if (!n.is_read) {
      markRead(n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (n.url) router.push(n.url);
  }

  async function handleMarkAllRead() {
    try {
      await markAllRead();
      setUnreadCount(0);
      setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
      toast.success(t("page.markAllReadSuccess"));
    } catch {
      toast.error(t("page.markAllReadError"));
    }
  }

  return (
    <PullToRefresh onRefresh={load}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t("page.title")}</h1>
            <p className="mt-1 text-text-secondary">{t("page.subtitle")}</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <Checks size={18} aria-hidden />
              {t("page.markAllRead")}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3" aria-busy>
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl border border-border bg-surface-1"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={BellSlash}
            title={t("empty.title")}
            description={t("empty.desc")}
          />
        ) : (
          <div className="space-y-3">
            {items.map((n) => (
              <NotificationRow key={n.id} n={n} onRead={() => handleRowClick(n)} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <PaginationBar
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            ariaLabel={t("page.pagination")}
            prevLabel={t("page.prev")}
            nextLabel={t("page.next")}
          />
        )}
      </div>
    </PullToRefresh>
  );
}

function NotificationRow({ n, onRead }) {
  const t = useTranslations("notifications");
  const Icon = TYPE_ICON[n.type] ?? Info;

  return (
    <button
      type="button"
      onClick={onRead}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border p-4 text-start shadow-sm transition-colors hover:bg-surface-1",
        n.is_read ? "border-border bg-surface-1/50" : "border-border bg-surface-1"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          TYPE_COLOR[n.type] ?? "bg-surface-2 text-text-secondary"
        )}
        aria-hidden
      >
        <Icon size={20} weight="duotone" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0 flex-1">
            <span className="block font-heading text-sm font-semibold text-text-primary">
              {n.title}
            </span>
            {n.body && (
              <span className="mt-0.5 block text-sm text-text-secondary">{n.body}</span>
            )}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              n.is_read
                ? "bg-surface-2 text-text-secondary/70"
                : "bg-primary-600/10 text-primary-700"
            )}
          >
            {t(`types.${n.type}`)}
          </span>
        </span>
        <RelativeTime date={n.created_at} className="mt-1 block text-xs text-text-secondary/80" />
      </span>

      {!n.is_read && (
        <span
          className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-600"
          aria-label={t("dropdown.unreadBadge")}
        />
      )}
    </button>
  );
}
