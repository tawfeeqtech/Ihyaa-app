/**
 * EPIC-09 · Realtime (US-048 · T074) — Laravel Echo singleton over Reverb.
 *
 * Only critical events are broadcast (interest_new · evaluation_completed —
 * config/notifications.php). The client subscribes to the recipient's PRIVATE
 * channel `private-notifications.{userId}` and listens for `notification.received`
 * (the broadcastAs name of CriticalNotificationBroadcast), then pushes the
 * payload into the central unread store — the bell badge +1 and the dropdown
 * list gains a row at the top (capped at 5).
 *
 * Channel auth: POST /api/broadcasting/auth with a Sanctum Bearer token (see
 * BroadcastServiceProvider). The user id is resolved from GET /me — the auth
 * context does not carry it — and cached module-side.
 *
 * Reverb defaults match backend/.env; override via NEXT_PUBLIC_REVERB_*.
 */

import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { api, API_BASE_URL, AUTH_COOKIE } from "@/shared/lib/api";
import { unreadStore } from "@/features/notifications/store/unreadStore";
import { mapApiNotification } from "@/features/notifications/lib/notifications";

/** EPIC-10 (T065) — optional critical-event subscribers (e.g. the events feed). */
const criticalListeners = new Set();

const REVERB_APP_KEY =
  process.env.NEXT_PUBLIC_REVERB_APP_KEY ?? "ZtS9oIt1sa00q9z69H09OOefdCgnxE2jBZoLulcY98Y=";
const REVERB_HOST = process.env.NEXT_PUBLIC_REVERB_HOST ?? "127.0.0.1";
const REVERB_PORT = process.env.NEXT_PUBLIC_REVERB_PORT ?? "8090";
const REVERB_SCHEME = process.env.NEXT_PUBLIC_REVERB_SCHEME ?? "http";

let echo = null;
let currentUserId = null;

function readCookie(name) {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * Lazily build the Echo instance and subscribe to the current user's private
 * notifications channel. Resolves to the Echo instance, or null when the user
 * is anonymous / the backend is unreachable (the UI stays fully functional).
 */
export async function getRealtime() {
  if (typeof window === "undefined") return null;
  if (echo && currentUserId) return echo;

  // Resolve the current user id (the auth context doesn't carry it).
  const me = await api.get("/me").catch(() => null);
  if (!me?.id) return null;
  currentUserId = me.id;

  if (!echo) {
    echo = new Echo({
      broadcaster: "reverb",
      key: REVERB_APP_KEY,
      client: Pusher,
      wsHost: REVERB_HOST,
      wsPort: Number(REVERB_PORT),
      wssPort: Number(REVERB_PORT),
      forceTLS: REVERB_SCHEME === "https",
      enabledTransports: ["ws", "wss"],
      authEndpoint: `${API_BASE_URL}/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${readCookie(AUTH_COOKIE) ?? ""}`,
          Accept: "application/json",
        },
      },
    });
  }

  const channel = echo.private(`notifications.${currentUserId}`);
  channel.stopListening("notification.received");
  channel.listen("notification.received", (payload) => {
    if (payload?.notification) {
      const notification = mapApiNotification(payload.notification);
      unreadStore.receive(notification);
      // EPIC-10 (T065) — fan out to the dashboard events feed store.
      for (const cb of criticalListeners) cb(notification);
    }
  });

  return echo;
}

/**
 * Register a callback invoked for every critical broadcast (`notification.received`).
 * Returns an unsubscribe function. Consumers (the dashboard events feed) use this
 * instead of reaching into the private channel themselves.
 */
export function onCriticalEvent(callback) {
  criticalListeners.add(callback);
  return () => criticalListeners.delete(callback);
}

/** Disconnect the underlying connection (used on logout / tests). */
export function disconnectRealtime() {
  if (echo) {
    echo.disconnect();
    echo = null;
    currentUserId = null;
  }
}
