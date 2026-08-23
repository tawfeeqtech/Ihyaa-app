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
  const role = rawRole === "investor" ? "investor" : "idea_owner";
  const userName = cookieStore.get("ihyaa_name")?.value ?? t("guest");

  return (
    <div className="flex min-h-screen flex-col">
      <Header hideAuthActions={authed} />

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Mobile quick-nav (sidebar is desktop-only) */}
        {authed && (
          <nav
            aria-label={t("mobileNavigation")}
            className="flex gap-2 overflow-x-auto pb-1 lg:hidden"
          >
            <SidebarMobileLinks role={role} labels={{ overview: t("overview"), newProject: t("newProject") }} />
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
        className="shrink-0 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white"
      >
        {labels.newProject}
      </Link>
    </>
  );
}
