"use client";

import { useCallback, useEffect, useState } from "react";
import { unreadStore, useUnreadCountSnapshot } from "../store/unreadStore";
import {
  fetchRecent,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  mapApiNotification,
} from "../lib/notifications";
import { useAuth } from "@/features/auth";

/**
 * EPIC-09 · useUnreadCount (T070 · T079 · US-047/049).
 *
 * Returns { unreadCount, recent, initialized, loading, refresh, markRead, markAllRead }.
 *
 * - T079: on mount (post page reload) re-fetches unread-count + last 5 and
 *   hydrates the store — the badge reflects the DB on every load.
 * - T070: `markRead`/`markAllRead` optimistically update the store and then
 *   reconcile with the server (the source of truth).
 * - T074: the Echo client calls `unreadStore.receive(...)` directly on
 *   `notification.received`, so the badge/list update live without this hook.
 */
export function useUnreadCount() {
  const { isAuthenticated } = useAuth();
  const unreadCount = useUnreadCountSnapshot();
  const [recent, setRecent] = useState(() => unreadStore.getRecent());
  const [initialized, setInitialized] = useState(() => unreadStore.isInitialized());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [count, items] = await Promise.all([fetchUnreadCount(), fetchRecent()]);
      unreadStore.hydrate({
        unreadCount: count?.unread_count ?? 0,
        recent: (items ?? []).map(mapApiNotification),
      });
      setRecent(unreadStore.getRecent());
      setInitialized(true);
    } catch {
      // Keep whatever the store already holds — don't blow up the header on a
      // transient network failure (US-049 relies on the DB on reload, not here).
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // T079 — re-fetch on mount / when auth state flips (login/logout).
  useEffect(() => {
    if (isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refresh();
    } else {
      unreadStore.reset();
    }
  }, [isAuthenticated, refresh]);

  // Keep this component's `recent` mirror in sync with the module store when
  // the Echo client or another consumer updates it.
  useEffect(() => {
    return unreadStore.subscribe(() => {
      setRecent(unreadStore.getRecent());
      setInitialized(unreadStore.isInitialized());
    });
  }, []);

  const markRead = useCallback(async (id) => {
    unreadStore.markRead(id);
    setRecent(unreadStore.getRecent());
    try {
      await markNotificationRead(id);
    } catch {
      // Optimistic update already applied; the server is the source of truth
      // on the next refresh.
    }
  }, []);

  const markAllRead = useCallback(async () => {
    unreadStore.markAllRead();
    setRecent(unreadStore.getRecent());
    try {
      await markAllNotificationsRead();
    } catch {
      // No-op — next refresh reconciles.
    }
  }, []);

  return { unreadCount, recent, initialized, loading, refresh, markRead, markAllRead };
}
