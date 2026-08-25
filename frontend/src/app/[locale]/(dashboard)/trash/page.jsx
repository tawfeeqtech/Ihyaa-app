import { setRequestLocale, getTranslations } from "next-intl/server";
import { fetchTrash } from "@/features/dashboard/lib/dashboard";
import { TrashList } from "@/features/dashboard/components/trash-list";

/**
 * EPIC-10 · Trash page (US-055 · T075) — 30-day soft-delete recovery.
 *
 * Server shell: fetches the owner's trashed projects (trash-api.md §1) and
 * hands them to the client `TrashList` widget, which owns the restore /
 * force-delete mutations (T076). Reads GET /api/trashed-projects via
 * `fetchTrash` (`cache: "no-store"` — the page reflects the DB every load).
 */
export default async function TrashPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("trash");

  const items = await fetchTrash();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-text-secondary">{t("subtitle")}</p>
      </div>
      <TrashList initialItems={items ?? []} />
    </div>
  );
}
