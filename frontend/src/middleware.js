import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./config/i18n/routing";

const intlMiddleware = createMiddleware(routing);

/** Auth cookie name — set by the Laravel backend after successful login. */
export const AUTH_COOKIE = "ihyaa_token";
export const ROLE_COOKIE = "ihyaa_role";
export const EMAIL_COOKIE = "ihyaa_email";
export const VERIFIED_COOKIE = "ihyaa_verified";

/** Paths that are only reachable when authenticated. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/projects/new",
  "/profile",
  "/interests",
  "/agreements",
];

/** Dynamic project-edit pages (/projects/{id}/edit) are owner-only. */
function isProjectEditPath(path) {
  return /^\/projects\/[^/]+\/edit$/.test(path);
}

/**
 * Paths that require an email-verified account (backend: `email.verified`
 * middleware — رفع مشروع، إبداء اهتمام، AI، ...). غير المفعّل يُوجَّه لصفحة OTP
 * قبل الوصول إليها (الدستور V — لا دخول قبل تفعيل البريد).
 */
function isEmailVerifiedPath(path) {
  return path === "/projects/new" || isProjectEditPath(path);
}

/** Paths that are only reachable when NOT authenticated. */
const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-otp"];

/**
 * Middleware chain:
 *  1. Resolve the locale prefix from the pathname.
 *  2. Enforce auth on protected / guest-only routes.
 *  3. Role guard: idea_owner ↔ investor dashboards are mutually exclusive (US-006).
 *  4. Delegate to next-intl's locale middleware (redirects/rewrites).
 */
export default function middleware(request) {
  const { pathname } = request.nextUrl;

  // Resolve locale from the leading segment (no locale = default).
  const segments = pathname.split("/").filter(Boolean);
  const rawLocale = segments[0] ?? "";
  const locale = routing.locales.includes(rawLocale)
    ? rawLocale
    : routing.defaultLocale;
  const path = routing.locales.includes(rawLocale)
    ? `/${segments.slice(1).join("/")}`
    : pathname;

  const isAuthed = Boolean(request.cookies.get(AUTH_COOKIE));
  const isVerified = request.cookies.get(VERIFIED_COOKIE)?.value === "1";
  const email = request.cookies.get(EMAIL_COOKIE)?.value ?? "";
  const isProtected =
    PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`)) ||
    isProjectEditPath(path);
  const isAuthPage = AUTH_PAGES.some((p) => path === p);

  const role = request.cookies.get(ROLE_COOKIE)?.value;

  // Guest → protected: redirect to login, remembering where they wanted to go.
  if (isProtected && !isAuthed) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  // الدستور V: مسجّل الدخول لكن البريد غير مفعّل → وجّه لصفحة OTP قبل الوصول
  // لصفحات رفع/تعديل المشروع (بدل مشاهدة خطأ 403 خام من الـ backend).
  if (isEmailVerifiedPath(path) && isAuthed && !isVerified) {
    const verifyUrl = new URL(`/${locale}/verify-otp`, request.url);
    if (email) verifyUrl.searchParams.set("email", email);
    return NextResponse.redirect(verifyUrl);
  }

  // Bare /dashboard → redirect to role-specific dashboard.
  if (isAuthed && path === "/dashboard") {
    const target =
      role === "investor" ? "/dashboard/investor" : "/dashboard/owner";
    return NextResponse.redirect(new URL(`/${locale}${target}`, request.url));
  }

  // Role guard (US-006 / UC-01/E3): idea-owner and investor dashboards are
  // mutually exclusive — cross-role access redirects to the role's own
  // dashboard with `?error=unauthorized_role` for the layout toast.
  const isOwnerDashboard = path === "/dashboard/owner" || path.startsWith("/dashboard/owner/");
  const isInvestorDashboard =
    path === "/dashboard/investor" || path.startsWith("/dashboard/investor/");

  // EPIC-08 boards are role-scoped (interest-api.md permission matrix):
  // /interests/received is idea-owner only, /interests/sent is investor only.
  const isReceivedBoard = path === "/interests/received" || path.startsWith("/interests/received/");
  const isSentBoard = path === "/interests/sent" || path.startsWith("/interests/sent/");

  if (isAuthed && (isOwnerDashboard || isInvestorDashboard || isReceivedBoard || isSentBoard) && role) {
    const mismatch =
      (isOwnerDashboard && role !== "idea_owner") ||
      (isInvestorDashboard && role !== "investor") ||
      (isReceivedBoard && role !== "idea_owner") ||
      (isSentBoard && role !== "investor");

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
  // استثناء: غير المفعّل يُسمح له بالبقاء على /verify-otp لإدخال رمز التفعيل
  // (الدستور V) — وإلا لانتهى به الأمر في حلقة إعادة توجيه.
  if (isAuthPage && isAuthed) {
    const isVerifyOtp = path === "/verify-otp";
    if (!(isVerifyOtp && !isVerified)) {
      const dashboard =
        role === "investor" ? `/${locale}/dashboard/investor` : `/${locale}/dashboard/owner`;
      return NextResponse.redirect(new URL(dashboard, request.url));
    }
  }

  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except:
  // - API routes, internals and dotfiles (favicon, assets…)
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
