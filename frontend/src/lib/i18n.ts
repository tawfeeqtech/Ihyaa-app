/**
 * Central i18n helpers for the app layer.
 * The routing + request config live in `src/i18n/` (next-intl convention);
 * this module re-exports the pieces app code needs most often.
 */
import { routing, type AppLocale } from "@/i18n/routing";

export { routing };
export type { AppLocale };

export { Link, redirect, usePathname, useRouter } from "@/i18n/navigation";

/** Human-readable display names for the locale switcher. */
export const localeNames: Record<AppLocale, string> = {
  ar: "العربية",
  en: "English",
};
