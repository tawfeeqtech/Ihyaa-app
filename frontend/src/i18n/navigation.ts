import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware navigation helpers (next-intl v4).
 * Use these instead of `next/navigation` / `next/link` so every
 * navigation stays inside the current locale prefix.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
