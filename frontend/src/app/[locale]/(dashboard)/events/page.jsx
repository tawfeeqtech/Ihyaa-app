import { setRequestLocale, getTranslations } from "next-intl/server";
import { EventsList } from "@/features/dashboard/components/events-list";

/**
 * EPIC-10 · Events page (US-053/2 · T064) — the full owner activity log.
 *
 * Server shell (RTL locale + header); the paginated, realtime-aware list lives
 * in the client `EventsList` widget. Reads GET /api/notifications (20/page,
 * OFFSET — the actual backend contract) through fetchNotifications.
 */
export default async function EventsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("events");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-text-secondary">{t("subtitle")}</p>
      </div>
      <EventsList />
    </div>
  );
}
