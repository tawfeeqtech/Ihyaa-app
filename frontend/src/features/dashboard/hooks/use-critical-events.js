"use client";

import { useEffect } from "react";
import { getRealtime, onCriticalEvent } from "@/lib/realtime/echo";
import { eventsFeedStore, useCriticalEventsSnapshot } from "../store/eventsFeedStore";

/**
 * EPIC-10 · useCriticalEvents (T065 · US-053/2 — US-048).
 *
 * Returns the live list of critical events broadcast over Reverb (newest
 * first, capped at 20). On mount it ensures the Echo connection is up (which
 * registers the `notification.received` listener on the user's private channel)
 * and subscribes the events feed store to that listener, so a broadcast event
 * prepends a row without a reload.
 *
 * Safe to mount anywhere; when Echo is unavailable (anonymous / backend down)
 * the list simply stays empty and the paginated page keeps working.
 */
export function useCriticalEvents() {
  const events = useCriticalEventsSnapshot();

  useEffect(() => {
    // Make sure the private channel listener is live before registering.
    getRealtime().catch(() => {});
    const unsubscribe = onCriticalEvent((notification) =>
      eventsFeedStore.receive(notification)
    );
    return unsubscribe;
  }, []);

  return events;
}
