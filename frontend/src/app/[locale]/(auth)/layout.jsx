"use client";

import { useTranslations } from "next-intl";
import { Flame, Rocket, Users } from "@phosphor-icons/react";
import { Logo } from "@/shared/layout/Logo";
import { Link } from "@/config/i18n/link";

/**
 * Split-screen auth shell.
 * RTL (Arabic): form on the right, visual panel on the left.
 * LTR (English): mirrored — form on the left, visual panel on the right.
 */
export default function AuthLayout({ children }) {
  const t = useTranslations("auth");

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Form side — first in DOM = start side (right in RTL) */}
      <section className="flex flex-col bg-surface-0 px-4 py-8 sm:px-10 lg:px-16">
        <Logo />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          {children}
        </div>
        <p className="text-center text-xs text-text-secondary">
          {t("layoutNote")}
        </p>
      </section>

      {/* Visual side — primary-600 with islamic pattern */}
      <aside className="relative hidden overflow-hidden bg-primary-600 pattern-islamic lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="relative z-10 space-y-8 text-on-primary">
          <span
            aria-hidden
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 shadow-glow"
          >
            <Flame size={36} weight="fill" className="text-on-primary" />
          </span>
          <h2 className="max-w-md font-heading text-4xl font-bold leading-snug">
            {t("visualTitle")}
          </h2>
          <p className="max-w-md text-lg text-on-primary/85">{t("visualSubtitle")}</p>

          <ul className="space-y-4">
            {[
              { icon: Rocket, label: t("visualPoints.1") },
              { icon: Flame, label: t("visualPoints.2") },
              { icon: Users, label: t("visualPoints.3") },
            ].map(({ icon: IconComponent, label }) => (
              <li key={label} className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <IconComponent size={22} weight="bold" className="text-on-primary" />
                </span>
                <span className="text-on-primary/90">{label}</span>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-4 border-t border-on-primary/20 pt-6 text-sm text-on-primary/75">
            <p>
              <strong className="block font-heading text-2xl font-bold text-on-primary">2,450+</strong>
              {t("stats.projects")}
            </p>
            <p>
              <strong className="block font-heading text-2xl font-bold text-on-primary">890+</strong>
              {t("stats.investors")}
            </p>
            <p>
              <strong className="block font-heading text-2xl font-bold text-on-primary">120+</strong>
              {t("stats.deals")}
            </p>
          </div>

          <Link
            href="/register"
            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-on-primary/50 px-5 text-sm font-semibold text-on-primary transition-colors hover:bg-on-primary/10"
          >
            {t("visualCta")}
          </Link>
        </div>
      </aside>
    </main>
  );
}
