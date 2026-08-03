import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

/** Auth cookie name — set by the Laravel backend after successful login. */
export const AUTH_COOKIE = "ihyaa_token";
export const ROLE_COOKIE = "ihyaa_role";

/** Paths that are only reachable when authenticated. */
const PROTECTED_PREFIXES = ["/dashboard", "/projects/new"];

/** Paths that are only reachable when NOT authenticated. */
const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/verify-otp"];

/**
 * Middleware chain:
 *  1. Resolve the locale prefix from the pathname.
 *  2. Enforce auth on protected / guest-only routes.
 *  3. Role guard: idea_owner ↔ investor dashboards are mutually exclusive (US-006).
 *  4. Delegate to next-intl's locale middleware (redirects/rewrites).
 */
export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Resolve locale from the leading segment (no locale = default).
  const segments = pathname.split("/").filter(Boolean);
  const rawLocale = segments[0] ?? "";
  const locale = (routing.locales as readonly string[]).includes(rawLocale)
    ? rawLocale
    : routing.defaultLocale;
  const path = (routing.locales as readonly string[]).includes(rawLocale)
    ? `/${segments.slice(1).join("/")}`
    : pathname;

  const isAuthed = Boolean(request.cookies.get(AUTH_COOKIE));
  const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  const isAuthPage = AUTH_PAGES.some((p) => path === p);

  // Guest → protected: redirect to login, remembering where they wanted to go.
  if (isProtected && !isAuthed) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  // Role guard (US-006 / UC-01/E3): idea-owner and investor dashboards are
  // mutually exclusive — cross-role access redirects to the role's own
  // dashboard with `?error=unauthorized_role` for the layout toast.
  const role = request.cookies.get(ROLE_COOKIE)?.value;
  const isOwnerDashboard = path === "/dashboard/owner" || path.startsWith("/dashboard/owner/");
  const isInvestorDashboard =
    path === "/dashboard/investor" || path.startsWith("/dashboard/investor/");

  if (isAuthed && (isOwnerDashboard || isInvestorDashboard) && role) {
    const mismatch =
      (isOwnerDashboard && role !== "idea_owner") ||
      (isInvestorDashboard && role !== "investor");

    if (mismatch) {
      const target =
        role === "investor"
          ? "/dashboard/investor"
          : role === "idea_owner"
            ? "/dashboard/owner"
            : null;

      if (target) {
        const dest = new URL(`/${locale}${target}`, request.url);
        dest.searchParams.set("error", "unauthorized_role");
        return NextResponse.redirect(dest);
      }
    }
  }

  // Authed → auth pages: send them to their dashboard.
  if (isAuthPage && isAuthed) {
    const dashboard =
      role === "investor" ? `/${locale}/dashboard/investor` : `/${locale}/dashboard/owner`;
    return NextResponse.redirect(new URL(dashboard, request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except:
  // - API routes, internals and dotfiles (favicon, assets…)
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
