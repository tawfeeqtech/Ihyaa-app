/**
 * App config barrel.
 * i18n routing, navigation helpers and locale display names.
 */
export { routing } from "./i18n/routing";
export { Link, redirect, usePathname, useRouter, getPathname } from "./i18n/navigation";
export { localeNames } from "./i18n/link";

/**
 * Backend API base URL (Laravel).
 * Defaults to the local dev server; override with the NEXT_PUBLIC_API_URL
 * env var in production (matches `src/shared/lib/api.js`).
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
