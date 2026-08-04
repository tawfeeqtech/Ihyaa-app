"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { List, Moon, SignOut, Sun, UserCircle, X } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/config/i18n/link";
import { Logo } from "./Logo";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { useTheme } from "@/shared/lib/ThemeProvider";
import { useToast } from "@/shared/components/Toast";
import { Button } from "@/shared/components/Button";
import { cn } from "@/shared/utils";

export function Header({ authed = false }) {
  const t = useTranslations("nav");
  const common = useTranslations("common");
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: "/projects", label: t("explore") },
    { href: "/#how-it-works", label: t("howItWorks") },
    { href: "/#ai-showcase", label: t("about") },
  ];

  function handleLogout() {
    document.cookie = "ihyaa_token=;path=/;max-age=0";
    document.cookie = "ihyaa_role=;path=/;max-age=0";
    localStorage.removeItem("ihyaa_user");
    toast.info(common("loggedOut"));
    router.push("/");
  }

  const isActive = (href) =>
    href.startsWith("/#") ? false : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface-0/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Logo />
          {/* Centered nav is an anti-pattern (NN Group) — left-aligned (start) */}
          <nav aria-label={t("mainNavigation")} className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "min-h-12 inline-flex items-center rounded-lg px-3 text-sm font-medium transition-colors hover:bg-surface-1",
                  isActive(link.href) ? "text-primary-600" : "text-text-secondary"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <LocaleSwitcher />

          <button
            type="button"
            onClick={toggle}
            aria-label={theme === "dark" ? t("lightMode") : t("darkMode")}
            className="inline-flex min-h-12 w-12 items-center justify-center rounded-lg text-text-primary transition-colors hover:bg-surface-1"
          >
            {theme === "dark" ? (
              <Sun size={20} weight="regular" />
            ) : (
              <Moon size={20} weight="regular" />
            )}
          </button>

          {authed ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/dashboard"
                className="inline-flex min-h-12 items-center gap-2 rounded-lg px-3 text-sm font-medium text-text-primary transition-colors hover:bg-surface-1"
              >
                <UserCircle size={20} className="text-primary-600" />
                {t("dashboard")}
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout} aria-label={t("logout")}>
                <SignOut size={18} />
              </Button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  {t("login")}
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">{t("getStarted")}</Button>
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? t("closeMenu") : t("openMenu")}
            className="inline-flex min-h-12 w-12 items-center justify-center rounded-lg text-text-primary transition-colors hover:bg-surface-1 md:hidden"
          >
            {mobileOpen ? <X size={24} /> : <List size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile navigation */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            aria-label={t("mainNavigation")}
            className="overflow-hidden border-t border-border md:hidden"
          >
            <div className="space-y-1 px-4 py-3">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-3 py-3 text-base font-medium text-text-primary transition-colors hover:bg-surface-1"
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 border-t border-border pt-3">
                {authed ? (
                  <>
                    <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                      <Button fullWidth variant="secondary">
                        {t("dashboard")}
                      </Button>
                    </Link>
                    <Button fullWidth variant="danger" onClick={handleLogout}>
                      {t("logout")}
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setMobileOpen(false)}>
                      <Button fullWidth variant="secondary">
                        {t("login")}
                      </Button>
                    </Link>
                    <Link href="/register" onClick={() => setMobileOpen(false)}>
                      <Button fullWidth>{t("getStarted")}</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
