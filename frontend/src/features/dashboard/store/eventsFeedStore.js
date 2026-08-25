/**
 * EPIC-10 · Critical-events feed store (US-053/2 · T065).
 *
 * A tiny module-level external store (same pattern as the notifications
 * unreadStore) that holds the last N critical events received over Reverb.
 * The owner dashboard feed and the /events page read it through
 * `useSyncExternalStore` so realtime `notification.received` broadcasts prepend
 * a row without a reload (US-048 · SRS-F09-04).
 *
 * The Echo client (src/lib/realtime/echo.js) is the only writer: its channel
 * listener calls `eventsFeedStore.receive(...)` for every broadcast.
 */

import { useSyncExternalStore } from "react";

const MAX = 20;

let events = [];
const listeners = new Set();

function emit() {
  for (const l of listeners) l();
}

export const eventsFeedStore = {
  getEvents: () => events,
  getSnapshot: () => events,
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Prepend a broadcast critical event, de-duplicated, capped at MAX. */
  receive(event) {
    if (!event?.id) return;
    events = [event, ...events.filter((e) => e.id !== event.id)].slice(0, MAX);
    emit();
  },

  /** Drop one event (after it is superseded / read). */
  remove(id) {
    events = events.filter((e) => e.id !== id);
    emit();
  },

  reset() {
    events = [];
    emit();
  },
};

/** React binding — the realtime critical-events list. */
export function useCriticalEventsSnapshot() {
  return useSyncExternalStore(
    eventsFeedStore.subscribe,
    eventsFeedStore.getSnapshot,
    eventsFeedStore.getSnapshot
  );
}
