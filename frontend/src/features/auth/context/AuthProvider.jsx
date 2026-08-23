"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/shared/lib/api";

/**
 * Central auth state for the Ihyaa frontend.
 *
 * Role values stored in the `ihyaa_role` cookie MUST match the backend
 * `UserRole` enum: `"idea_owner"` | `"investor"`.
 *
 * Email-verification state is tracked in `ihyaa_verified` (1/0) and the email
 * in `ihyaa_email`. Both are set on login / OAuth, and re-validated against
 * the backend (`GET /me`) on boot — this is what catches stale tokens issued
 * to unverified accounts (see `syncWithServer`).
 */

export const AuthContext = createContext(null);

export const AUTH_COOKIE = "ihyaa_token";
export const ROLE_COOKIE = "ihyaa_role";
export const NAME_COOKIE = "ihyaa_name";
export const EMAIL_COOKIE = "ihyaa_email";
export const VERIFIED_COOKIE = "ihyaa_verified";
export const USER_STORAGE_KEY = "ihyaa_user";

const MAX_AGE_DAY = 86400;
const MAX_AGE_MONTH = 2592000;

/** All auth cookies cleared together on logout / stale-token eviction. */
const AUTH_COOKIE_NAMES = [AUTH_COOKIE, ROLE_COOKIE, NAME_COOKIE, EMAIL_COOKIE, VERIFIED_COOKIE];

export function readCookie(name) {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function isUserRole(value) {
  return value === "idea_owner" || value === "investor";
}

/** Role-aware dashboard path. Falls back to `/login`. */
export function getDashboardHref(role) {
  if (role === "investor") return "/dashboard/investor";
  if (role === "idea_owner") return "/dashboard/owner";
  return "/login";
}

/** Build a locale-aware `/verify-otp` URL with an optional email query param. */
function verifyOtpHref(email) {
  const locale = typeof window !== "undefined" ? window.location.pathname.split("/")[1] || "ar" : "ar";
  const url = `/${locale}/verify-otp`;
  return email ? `${url}?email=${encodeURIComponent(email)}` : url;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // ——————————————————————— الإقلاع ———————————————————————
  // 1) استعادة الحالة من الكوكيز/التخزين المحلي.
  // 2) التحقق من صحة التوكن وحالة تفعيل البريد من المصدر الرسمي (GET /me).
  //    - توكن قديم لحساب غير مفعّل → يُمسح التوكن ويُوجَّه المستخدم لصفحة OTP.
  //    - توكن منتهي/غير صالح (401) → تُمسح الجلسة.
  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const token = readCookie(AUTH_COOKIE);
      const role = readCookie(ROLE_COOKIE);
      const name = readCookie(NAME_COOKIE);
      const email = readCookie(EMAIL_COOKIE);
      const verified = readCookie(VERIFIED_COOKIE);

      let restored = null;

      if (token && role && isUserRole(role)) {
        restored = {
          name: name ?? (role === "idea_owner" ? "صاحب فكرة" : "Investor"),
          role,
          email: email ?? "",
          emailVerified: verified === "1",
        };
      } else {
        try {
          const raw = localStorage.getItem(USER_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.role && isUserRole(parsed.role)) {
              restored = {
                name: parsed.name ?? "Guest",
                role: parsed.role,
                email: parsed.email ?? "",
                emailVerified: Boolean(parsed.emailVerified),
              };
            }
          }
        } catch {
          /* ignore malformed storage */
        }
      }

      // الطبقة الثانية (الدفاع): التوكن القديم + حالة التفعيل — GET /me
      if (restored && token) {
        try {
          const me = await api.get("/me");

          if (me && me.email_verified === false) {
            // الجذر الجذري للـ bug: توكن قديم لحساب غير مفعّل البريد.
            // امسح الجلسة ووجّه لصفحة إدخال رمز التفعيل (الدستور V).
            for (const c of AUTH_COOKIE_NAMES) {
              document.cookie = `${c}=;path=/;max-age=0`;
            }
            localStorage.removeItem(USER_STORAGE_KEY);
            setUser(null);
            window.location.replace(verifyOtpHref(me.email ?? email ?? ""));
            return;
          }

          // مفعّل (أو الحساب غير متطلب للتفعيل) — حدّث البيانات من المصدر الرسمي.
          restored = {
            name: me.name ?? restored.name,
            role: me.role ?? restored.role,
            email: me.email ?? restored.email,
            emailVerified: Boolean(me.email_verified),
          };
          document.cookie = `${NAME_COOKIE}=${encodeURIComponent(restored.name)};path=/;max-age=${MAX_AGE_DAY};samesite=lax`;
          document.cookie = `${ROLE_COOKIE}=${restored.role};path=/;max-age=${MAX_AGE_DAY};samesite=lax`;
          document.cookie = `${EMAIL_COOKIE}=${encodeURIComponent(restored.email)};path=/;max-age=${MAX_AGE_DAY};samesite=lax`;
          document.cookie = `${VERIFIED_COOKIE}=${restored.emailVerified ? "1" : "0"};path=/;max-age=${MAX_AGE_DAY};samesite=lax`;
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(restored));
        } catch (err) {
          // 401 = توكن منتهي/غير صالح → امسح الجلسة.
          // أخطاء الشبكة الأخرى: نُبقي الحالة المستعادة من الكوكيز (لا نقطع الجلسة).
          if (err.status === 401) {
            for (const c of AUTH_COOKIE_NAMES) {
              document.cookie = `${c}=;path=/;max-age=0`;
            }
            localStorage.removeItem(USER_STORAGE_KEY);
            restored = null;
          }
        }
      }

      setUser(restored);
      setIsLoading(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const login = useCallback((token, user, remember = false) => {
    const maxAge = remember ? `max-age=${MAX_AGE_MONTH}` : `max-age=${MAX_AGE_DAY}`;
    const email = user?.email ?? "";
    const emailVerified = Boolean(user?.email_verified);

    document.cookie = `${AUTH_COOKIE}=${token};path=/;${maxAge};samesite=lax`;
    document.cookie = `${ROLE_COOKIE}=${user.role};path=/;${maxAge};samesite=lax`;
    document.cookie = `${NAME_COOKIE}=${encodeURIComponent(user.name)};path=/;${maxAge};samesite=lax`;
    document.cookie = `${EMAIL_COOKIE}=${encodeURIComponent(email)};path=/;${maxAge};samesite=lax`;
    document.cookie = `${VERIFIED_COOKIE}=${emailVerified ? "1" : "0"};path=/;${maxAge};samesite=lax`;
    localStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify({ name: user.name, role: user.role, email, emailVerified })
    );
    setUser({ name: user.name, role: user.role, email, emailVerified });
  }, []);

  const logout = useCallback(() => {
    for (const name of AUTH_COOKIE_NAMES) {
      document.cookie = `${name}=;path=/;max-age=0`;
    }
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        email: user?.email ?? "",
        emailVerified: user?.emailVerified ?? false,
        isLoading,
        isAuthenticated: Boolean(user),
        isEmailVerified: Boolean(user?.emailVerified),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
