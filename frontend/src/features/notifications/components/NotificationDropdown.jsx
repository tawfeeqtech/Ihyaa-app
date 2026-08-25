"use client";

import { useTranslations } from "next-intl";
import {
  BellSlash,
  CheckCircle,
  ChartLine,
  Handshake,
  Info,
  Prohibit,
  Sparkle,
  XCircle,
} from "@phosphor-icons/react";
import { Link, useRouter } from "@/config/i18n/link";
import { Button } from "@/shared/components/Button";
import { RelativeTime } from "./RelativeTime";
import { cn } from "@/shared/utils";

/**
 * EPIC-09 · NotificationDropdown (T069 · US-047) — last 5 + «view all».
 *
 * Each row: a type icon, title/body and a relative RTL time. Clicking a row
 * marks it read (T070) and navigates to the entity's url (data.url — T069).
 * The footer holds a «view all» link and a «mark all read» action. Rows arrive
 * newest-first from the central store (T070/T074).
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

export function NotificationDropdown({
  recent,
  initialized,
  unreadCount,
  onNavigate,
  onMarkRead,
  onMarkAllRead,
}) {
  const t = useTranslations("notifications");
  const router = useRouter();

  function handleRowClick(n) {
    onMarkRead?.(n.id);
    onNavigate?.();
    if (n.url) router.push(n.url);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface-0 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <p className="font-heading text-sm font-bold text-text-primary">{t("dropdown.title")}</p>
        <span className="text-xs tabular-nums text-text-secondary">
          {t("dropdown.unread", { count: unreadCount })}
        </span>
      </div>

      {/* List */}
      <div
        className="max-h-96 overflow-y-auto"
        role="list"
        aria-label={t("dropdown.listLabel")}
      >
        {!initialized ? (
          <p className="px-4 py-8 text-center text-sm text-text-secondary">
            {t("dropdown.loading")}
          </p>
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <BellSlash size={28} weight="light" className="text-text-secondary" aria-hidden />
            <p className="text-sm text-text-secondary">{t("empty.title")}</p>
          </div>
        ) : (
          recent.map((n) => {
            const Icon = TYPE_ICON[n.type] ?? Info;
            return (
              <button
                key={n.id}
                type="button"
                role="listitem"
                onClick={() => handleRowClick(n)}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-border px-4 py-3 text-start transition-colors hover:bg-surface-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-600",
                  !n.is_read && "bg-accent-50/60"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    TYPE_COLOR[n.type] ?? "bg-surface-2 text-text-secondary"
                  )}
                  aria-hidden
                >
                  <Icon size={18} weight="duotone" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold text-text-primary">
                      {n.title}
                    </span>
                    {!n.is_read && (
                      <span
                        className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-600"
                        aria-label={t("dropdown.unreadBadge")}
                      />
                    )}
                  </span>
                  {n.body && (
                    <span className="mt-0.5 block truncate text-xs text-text-secondary">
                      {n.body}
                    </span>
                  )}
                  <RelativeTime date={n.created_at} className="mt-0.5 block text-[11px] text-text-secondary/80" />
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2">
        <Link href="/notifications" onClick={onNavigate}>
          <Button size="sm" variant="ghost">
            {t("dropdown.viewAll")}
          </Button>
        </Link>
        {unreadCount > 0 && (
          <Button size="sm" variant="ghost" onClick={onMarkAllRead}>
            {t("dropdown.markAllRead")}
          </Button>
        )}
      </div>
    </div>
  );
}
