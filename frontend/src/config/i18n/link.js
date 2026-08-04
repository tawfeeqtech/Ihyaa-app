/**
 * Central i18n helpers for the app layer.
 * The routing + request config live in `src/config/i18n/` (next-intl convention);
 * this module re-exports the pieces app code needs most often.
 */
import { routing } from "./routing";

export { routing };

export { Link, redirect, usePathname, useRouter } from "./navigation";

/** Human-readable display names for the locale switcher. */
export const localeNames = {
  ar: "العربية",
  en: "English",
};
