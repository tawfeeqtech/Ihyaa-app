/**
 * EPIC-09 — Central unread-count + recent-feed store (T070 · T079 · US-047/049).
 *
 * A tiny module-level external store read through `useSyncExternalStore` so the
 * bell badge and the dropdown stay consistent across pages AND update live when
 * the Echo client receives `notification.received` (T074 · US-048). The store
 * holds two slices:
 *   - `unreadCount` — the bell badge (fetched on mount, ±1 on read / 0 on read-all)
 *   - `recent` — the last 5 notifications for the dropdown, newest first
 *
 * Why a module store and not React Context: the Reverb listener lives outside
 * React (src/lib/realtime/echo.js) and must update UI state without threading a
 * provider through the tree. A module store + useSyncExternalStore is the
 * lightest correct primitive for that.
 */

import { useSyncExternalStore } from "react";

let unreadCount = 0;
let recent = [];
let initialized = false;
const listeners = new Set();

function emit() {
  for (const l of listeners) l();
}

export const unreadStore = {
  getUnreadCount: () => unreadCount,
  getRecent: () => recent,
  getSnapshot: () => unreadCount,
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Hydrate both slices after a server fetch (T079 — post-mount refresh). */
  hydrate({ unreadCount: count, recent: items }) {
    if (typeof count === "number") unreadCount = count;
    if (Array.isArray(items)) recent = items;
    initialized = true;
    emit();
  },

  /** A critical event arrived over WebSocket (T074 · US-048). */
  receive(notification) {
    unreadCount += 1;
    recent = [notification, ...recent.filter((n) => n.id !== notification.id)].slice(0, 5);
    emit();
  },

  markRead(id) {
    recent = recent.map((n) =>
      n.id === id
        ? { ...n, is_read: true, read_at: n.read_at ?? new Date().toISOString() }
        : n
    );
    unreadCount = Math.max(0, unreadCount - 1);
    emit();
  },

  markAllRead() {
    unreadCount = 0;
    recent = recent.map((n) => ({
      ...n,
      is_read: true,
      read_at: n.read_at ?? new Date().toISOString(),
    }));
    emit();
  },

  reset() {
    unreadCount = 0;
    recent = [];
    initialized = false;
    emit();
  },

  isInitialized: () => initialized,
};

/** React binding — subscribe to the badge count (useSyncExternalStore). */
export function useUnreadCountSnapshot() {
  return useSyncExternalStore(
    unreadStore.subscribe,
    unreadStore.getSnapshot,
    unreadStore.getSnapshot
  );
}
