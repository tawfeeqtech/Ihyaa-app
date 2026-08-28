import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Header } from "@/shared/layout/Header";
import { Footer } from "@/shared/layout/Footer";
import { Sidebar } from "@/shared/layout/Sidebar";
import { DashboardErrorToast } from "@/shared/layout/DashboardErrorToast";

/**
 * Shared shell for the dashboard group: Header + role-aware Sidebar + Footer.
 * Auth state is read from cookies (set by the middleware/backend).
 * Note: `/projects` stays publicly browsable — only `/dashboard/*` and
 * `/projects/new` are protected by the middleware.
 */
export default async function DashboardLayout({ children }) {
  const t = await getTranslations("sidebar");
  const cookieStore = await cookies();

  const authed = Boolean(cookieStore.get("ihyaa_token")?.value);
  const rawRole = cookieStore.get("ihyaa_role")?.value;
  // Preserve `admin` so the sidebar shows the admin nav (EPIC-12); anyone else
  // without a recognized role falls back to the idea-owner default.
  const role =
    rawRole === "investor" ? "investor" : rawRole === "admin" ? "admin" : "idea_owner";
  const userName = cookieStore.get("ihyaa_name")?.value ?? t("guest");

  return (
    <div className="flex min-h-screen flex-col">
      <Header hideAuthActions={authed} />

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:px-8">
        {/* Mobile quick-nav (sidebar is desktop-only) */}
        {authed && (
          <nav
            aria-label={t("mobileNavigation")}
            className="flex gap-2 overflow-x-auto pb-1 lg:hidden"
          >
            <SidebarMobileLinks
              role={role}
              labels={{
                overview: t("overview"),
                newProject: t("newProject"),
                receivedInterests: t("receivedInterests"),
                sentInterests: t("sentInterests"),
                adminAnalytics: t("adminAnalytics"),
                events: t("events"),
                trash: t("trash"),
              }}
            />
          </nav>
        )}

        {authed && <Sidebar role={role} userName={userName} />}

        <main className="min-w-0 flex-1">
          <DashboardErrorToast />
          {children}
        </main>
      </div>

      <Footer />
    </div>
  );
}

import { Link } from "@/config/i18n/link";
import { cn } from "@/shared/utils";

function SidebarMobileLinks({ role, labels }) {
  // EPIC-12: admin mobile nav is just the analytics entry (admins have no
  // project/interest workflows).
  if (role === "admin") {
    return (
      <Link
        href="/admin/analytics"
        className="shrink-0 inline-flex min-h-12 items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-medium text-on-primary"
      >
        {labels.adminAnalytics}
      </Link>
    );
  }

  return (
    <>
      <Link
        href={role === "investor" ? "/dashboard/investor" : "/dashboard/owner"}
        className={cn(
          "shrink-0 rounded-lg border border-border bg-surface-1 px-4 py-2.5 text-sm font-medium text-text-primary"
        )}
      >
        {labels.overview}
      </Link>
      <Link
        href="/projects/new"
        className="shrink-0 inline-flex min-h-12 items-center justify-center rounded-lg bg-primary-600 px-4 text-sm font-medium text-on-primary"
      >
        {labels.newProject}
      </Link>
      <Link
        href={role === "investor" ? "/interests/sent" : "/interests/received"}
        className="shrink-0 inline-flex min-h-12 items-center justify-center rounded-lg border border-border bg-surface-1 px-4 text-sm font-medium text-text-primary"
      >
        {role === "investor" ? labels.sentInterests : labels.receivedInterests}
      </Link>
      {role !== "investor" && (
        <>
          <Link
            href="/events"
            className="shrink-0 inline-flex min-h-12 items-center justify-center rounded-lg border border-border bg-surface-1 px-4 text-sm font-medium text-text-primary"
          >
            {labels.events}
          </Link>
          <Link
            href="/trash"
            className="shrink-0 inline-flex min-h-12 items-center justify-center rounded-lg border border-border bg-surface-1 px-4 text-sm font-medium text-text-primary"
          >
            {labels.trash}
          </Link>
        </>
      )}
    </>
  );
}
