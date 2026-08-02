"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CaretDown, GlobeHemisphereWest } from "@phosphor-icons/react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeNames, type AppLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Switch language with full page nav; keeps the current pathname. */
export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function switchTo(next: AppLocale) {
    if (next === locale) {
      setOpen(false);
      return;
    }
    writeLocaleCookie(next);
    router.replace(pathname, { locale: next });
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex min-h-12 items-center gap-2 rounded-lg px-3 text-sm font-medium text-text-primary transition-colors hover:bg-surface-1"
      >
        <GlobeHemisphereWest size={20} weight="regular" className="text-primary-600" />
        {localeNames[locale]}
        <CaretDown size={14} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="language"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute end-0 z-50 mt-1 w-36 overflow-hidden rounded-lg border border-border bg-surface-0 py-1 shadow-lg"
          >
            {routingLocales.map((l) => (
              <li key={l}>
                <button
                  type="button"
                  role="option"
                  aria-selected={l === locale}
                  onClick={() => switchTo(l)}
                  className={cn(
                    "flex min-h-11 w-full items-center justify-between px-4 text-sm transition-colors hover:bg-accent-100",
                    l === locale
                      ? "font-semibold text-primary-600"
                      : "text-text-primary"
                  )}
                >
                  {localeNames[l]}
                  {l === locale && (
                    <span aria-hidden className="h-2 w-2 rounded-full bg-primary-600" />
                  )}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Locale order for the dropdown (Arabic first). */
import { routing } from "@/i18n/routing";
const routingLocales = [...routing.locales] as AppLocale[];

/** Persist the choice so next-intl picks it up without the ?locale param. */
function writeLocaleCookie(next: AppLocale) {
  document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000;samesite=lax`;
}
