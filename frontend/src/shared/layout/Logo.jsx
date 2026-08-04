"use client";

import { Flame } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Link } from "@/config/i18n/link";
import { cn } from "@/shared/utils";

/**
 * Brand mark — flame/heartbeat icon in primary-600 with the soft glow
 * specified in ui-ux-design-prompt-v2.md (logo section).
 */
export function Logo({ className }) {
  const t = useTranslations("common");

  return (
    <Link
      href="/"
      className={cn(
        "inline-flex min-h-12 items-center gap-2 rounded-lg px-1 font-heading text-xl font-bold text-text-primary transition-opacity hover:opacity-80",
        className
      )}
      aria-label={t("appName")}
    >
      <span
        aria-hidden
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-100 shadow-glow"
      >
        <Flame size={22} weight="fill" className="text-primary-600" />
      </span>
      {t("appName")}
    </Link>
  );
}
