import { defineRouting } from "next-intl/routing";

/**
 * Supported locales — Arabic first (RTL-first product).
 * `localePrefix: 'always'` keeps every pathname prefixed (e.g. /ar, /en),
 * which makes locale detection explicit and avoids root redirect surprises.
 */
export const routing = defineRouting({
  locales: ["ar", "en"],
  defaultLocale: "ar",
  localePrefix: "always",
});
