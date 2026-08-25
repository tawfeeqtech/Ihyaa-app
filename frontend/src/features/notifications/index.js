/**
 * EPIC-09 — Notifications feature barrel (US-047/048/049).
 */
export { NotificationBell } from "./components/NotificationBell";
export { NotificationDropdown } from "./components/NotificationDropdown";
export { RelativeTime } from "./components/RelativeTime";
export { useUnreadCount } from "./hooks/useUnreadCount";
export { unreadStore } from "./store/unreadStore";

export {
  fetchNotifications,
  fetchRecent,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  mapApiNotification,
  NOTIFICATIONS_PAGE_SIZE,
  NOTIFICATIONS_RECENT_LIMIT,
} from "./lib/notifications";
