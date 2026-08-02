"use client";

import { GithubLogo, LinkedinLogo, XLogo } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n";
import { Logo } from "./Logo";

/** Footer per ui-ux-design-prompt-v2.md (shared elements section). */
export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="mt-auto border-t border-border bg-surface-1/50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {/* Column 1 — About */}
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-text-secondary">{t("aboutDescription")}</p>
          <div className="flex items-center gap-2">
            {[
              { icon: XLogo, label: "X (Twitter)" },
              { icon: LinkedinLogo, label: "LinkedIn" },
              { icon: GithubLogo, label: "GitHub" },
            ].map(({ icon: IconComponent, label }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface-0 text-text-secondary transition-colors hover:border-primary-600 hover:text-primary-600"
              >
                <IconComponent size={20} />
              </a>
            ))}
          </div>
        </div>

        {/* Column 2 — Quick links */}
        <nav aria-label={t("quickLinks")}>
          <h3 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wide text-text-primary">
            {t("quickLinks")}
          </h3>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link href="/projects" className="text-text-secondary transition-colors hover:text-primary-600">
                {t("projects")}
              </Link>
            </li>
            <li>
              <Link href="/register" className="text-text-secondary transition-colors hover:text-primary-600">
                {t("forInvestors")}
              </Link>
            </li>
            <li>
              <Link href="/#how-it-works" className="text-text-secondary transition-colors hover:text-primary-600">
                {t("howItWorks")}
              </Link>
            </li>
            <li>
              <Link href="/#faq" className="text-text-secondary transition-colors hover:text-primary-600">
                {t("faq")}
              </Link>
            </li>
          </ul>
        </nav>

        {/* Column 3 — Legal */}
        <nav aria-label={t("legal")}>
          <h3 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wide text-text-primary">
            {t("legal")}
          </h3>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link href="/login" className="text-text-secondary transition-colors hover:text-primary-600">
                {t("terms")}
              </Link>
            </li>
            <li>
              <Link href="/login" className="text-text-secondary transition-colors hover:text-primary-600">
                {t("privacy")}
              </Link>
            </li>
            <li>
              <Link href="/login" className="text-text-secondary transition-colors hover:text-primary-600">
                {t("agreement")}
              </Link>
            </li>
          </ul>
        </nav>

        {/* Column 4 — Contact */}
        <div>
          <h3 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wide text-text-primary">
            {t("contact")}
          </h3>
          <p className="text-sm text-text-secondary">{t("contactDescription")}</p>
          <p className="mt-3 text-sm font-medium text-text-primary">hello@ihyaa.app</p>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-text-secondary sm:flex-row sm:px-6 lg:px-8">
          <p>© 2026 {t("copyright")}</p>
          <p dir="ltr" className="font-mono">Made with ❤️ in the MENA region</p>
        </div>
      </div>
    </footer>
  );
}
