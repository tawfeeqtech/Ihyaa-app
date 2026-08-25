"use client";

import { ListMagnifyingGlass, Plus, Tray } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Link } from "@/config/i18n/link";
import { cn } from "@/shared/utils";

/**
 * EPIC-10 · Quick actions bar (US-054 · T067/T068/T069) — dashboard-api.md §5.
 *
 * Three primary destinations on the owner dashboard: إضافة مشروع جديد
 * (→ /projects/new) · عرض كل المشاريع (→ /projects) · إدارة الطلبات
 * (→ /interests/received · SRS-F08-06).
 *
 * US-068/T069: with zero projects the «إضافة مشروع جديد» action stays the
 * prominent primary CTA and the other two still work (leading to empty states
 * with their own CTAs). US-072/T068: on 360-767px the buttons stack full-width
 * (`w-full`, no overflow) — logical properties only (RTL-safe).
 *
 * Client component (Phosphor icons); labels from the `dashboard` namespace.
 */

export function QuickActions({ className }) {
  const t = useTranslations("dashboard");
  const actions = [
    {
      href: "/projects/new",
      label: t("owner.quickActions.addProject"),
      icon: Plus,
      variant: "primary",
    },
    {
      href: "/projects",
      label: t("owner.quickActions.viewAll"),
      icon: ListMagnifyingGlass,
      variant: "secondary",
    },
    {
      href: "/interests/received",
      label: t("owner.quickActions.manageRequests"),
      icon: Tray,
      variant: "secondary",
    },
  ];

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:flex-wrap", className)}>
      {actions.map(({ href, label, icon: IconComponent, variant }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg px-4 font-heading text-sm font-semibold transition-all duration-300 ease-out active:scale-[0.98] sm:w-auto",
            variant === "primary"
              ? "bg-primary-600 text-white shadow-md hover:bg-primary-500 hover:shadow-lg"
              : "border border-border bg-surface-1 text-text-primary shadow-sm hover:bg-surface-0"
          )}
        >
          <IconComponent size={18} weight="bold" aria-hidden />
          {label}
        </Link>
      ))}
    </div>
  );
}
