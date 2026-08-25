"use client";

import {
  ChartBar,
  Compass,
  FolderPlus,
  PaperPlaneTilt,
  SignOut,
  SquaresFour,
  Tray,
  UserCircle,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/config/i18n/link";
import { useToast } from "@/shared/components/Toast";
import { avatarHue, cn, initials } from "@/shared/utils";

/**
 * Role-aware dashboard sidebar (desktop: lg+; mobile nav rendered by the
 * dashboard layout). Links point to existing routes only.
 */
export function Sidebar({ role, userName }) {
  const t = useTranslations("sidebar");
  const common = useTranslations("common");
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const ownerItems = [
    { href: "/dashboard/owner", label: t("overview"), icon: SquaresFour },
    { href: "/projects/new", label: t("newProject"), icon: FolderPlus },
    { href: "/projects", label: t("exploreProjects"), icon: Compass },
    { href: "/interests/received", label: t("receivedInterests"), icon: Tray },
  ];

  const investorItems = [
    { href: "/dashboard/investor", label: t("overview"), icon: SquaresFour },
    { href: "/projects", label: t("exploreProjects"), icon: Compass },
    { href: "/interests/sent", label: t("sentInterests"), icon: PaperPlaneTilt },
  ];

  // EPIC-12: admins are seeded (never registered) and see only the analytics
  // area plus profile/logout (الدستور IV).
  const adminItems = [
    { href: "/admin/analytics", label: t("adminAnalytics"), icon: ChartBar },
  ];

  const items =
    role === "idea_owner" ? ownerItems : role === "admin" ? adminItems : investorItems;

  function handleLogout() {
    document.cookie = "ihyaa_token=;path=/;max-age=0";
    document.cookie = "ihyaa_role=;path=/;max-age=0";
    localStorage.removeItem("ihyaa_user");
    toast.info(common("loggedOut"));
    router.push("/");
  }

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 flex-col border-e border-border bg-surface-1/40 p-4 lg:flex">
      <nav aria-label={t("navigation")} className="flex-1 space-y-1">
        {items.map(({ href, label, icon: IconComponent }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-12 items-center gap-3 rounded-lg px-4 text-sm font-medium transition-colors",
                active
                  ? "bg-accent-100 text-primary-600 shadow-sm"
                  : "text-text-secondary hover:bg-surface-1 hover:text-text-primary"
              )}
            >
              <IconComponent size={20} weight={active ? "fill" : "regular"} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-border pt-4">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <span
            aria-hidden
            className="flex h-10 w-10 items-center justify-center rounded-full font-heading text-sm font-bold text-white"
            style={{ backgroundColor: avatarHue(userName) }}
          >
            {initials(userName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary">{userName}</p>
            <p className="text-xs text-text-secondary">
              {t(role === "idea_owner" ? "roleOwner" : role === "admin" ? "roleAdmin" : "roleInvestor")}
            </p>
          </div>
        </div>
        <Link
          href="/profile"
          className="flex min-h-12 items-center gap-3 rounded-lg px-4 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-1 hover:text-text-primary"
        >
          <UserCircle size={20} />
          {t("profile")}
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="flex min-h-12 w-full items-center gap-3 rounded-lg px-4 text-sm font-medium text-danger transition-colors hover:bg-tint-danger"
        >
          <SignOut size={20} />
          {t("logout")}
        </button>
      </div>
      <p className="mt-4 px-3 text-xs text-text-secondary">
        <ChartBar size={14} className="me-1 inline" />
        {t("betaLabel")}
      </p>
    </aside>
  );
}
