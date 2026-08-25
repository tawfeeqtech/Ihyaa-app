"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellRinging } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useUnreadCount } from "../hooks/useUnreadCount";
import { NotificationDropdown } from "./NotificationDropdown";
import { getRealtime } from "@/lib/realtime/echo";
import { cn } from "@/shared/utils";

/**
 * EPIC-09 · NotificationBell (T068 · US-047) — bell button + unread badge.
 *
 * The badge reads the central `useUnreadCount` store so it updates live when
 * the Echo client receives a critical event (T074 · US-048) or after
 * read/read-all. Clicking toggles the NotificationDropdown (last 5 + «view
 * all»). Tapping the bell also lazily boots the Reverb subscription.
 */
export function NotificationBell() {
  const t = useTranslations("notifications");
  const { unreadCount, recent, initialized, markRead, markAllRead } = useUnreadCount();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  // T074 — boot the Echo client once mounted (resolves /me, subscribes to
  // private-notifications.{userId}). Failures are silent: US-049 still works —
  // non-critical events are fetched on reload, critical ones never lost (DB).
  useEffect(() => {
    getRealtime().catch(() => {});
  }, []);

  // Close on outside click / Escape (a11y).
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onClick);
    };
  }, [open]);

  const showBadge = unreadCount > 0;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={t("bellLabel", { count: unreadCount })}
        className={cn(
          "relative inline-flex min-h-12 w-12 items-center justify-center rounded-lg text-text-primary transition-colors hover:bg-surface-1",
          open && "bg-surface-1"
        )}
      >
        {showBadge ? (
          <BellRinging size={20} weight="duotone" aria-hidden />
        ) : (
          <Bell size={20} aria-hidden />
        )}
        <AnimatePresence>
          {showBadge && (
            <motion.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute end-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold tabular-nums text-white"
              aria-hidden
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute end-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))]"
          >
            <NotificationDropdown
              recent={recent}
              initialized={initialized}
              unreadCount={unreadCount}
              onNavigate={() => setOpen(false)}
              onMarkRead={markRead}
              onMarkAllRead={markAllRead}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
