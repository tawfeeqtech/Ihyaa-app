"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

/**
 * Central auth state for the Ihyaa frontend.
 *
 * Role values stored in the `ihyaa_role` cookie MUST match the backend
 * `UserRole` enum: `"idea_owner"` | `"investor"`.
 */

export const AuthContext = createContext(null);

export const AUTH_COOKIE = "ihyaa_token";
export const ROLE_COOKIE = "ihyaa_role";
export const NAME_COOKIE = "ihyaa_name";
export const USER_STORAGE_KEY = "ihyaa_user";

const MAX_AGE_DAY = 86400;
const MAX_AGE_MONTH = 2592000;

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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const token = readCookie(AUTH_COOKIE);
      const role = readCookie(ROLE_COOKIE);
      const name = readCookie(NAME_COOKIE);

      if (token && role && isUserRole(role)) {
        setUser({
          name: name ?? (role === "idea_owner" ? "صاحب فكرة" : "Investor"),
          role,
        });
      } else {
        try {
          const raw = localStorage.getItem(USER_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.role && isUserRole(parsed.role)) {
              setUser({ name: parsed.name ?? "Guest", role: parsed.role });
            }
          }
        } catch {
          /* ignore malformed storage */
        }
      }
      setIsLoading(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const login = useCallback((next, remember = false) => {
    const maxAge = remember ? `max-age=${MAX_AGE_MONTH}` : `max-age=${MAX_AGE_DAY}`;
    document.cookie = `${AUTH_COOKIE}=demo;path=/;${maxAge};samesite=lax`;
    document.cookie = `${ROLE_COOKIE}=${next.role};path=/;${maxAge};samesite=lax`;
    document.cookie = `${NAME_COOKIE}=${encodeURIComponent(next.name)};path=/;${maxAge};samesite=lax`;
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next));
    setUser(next);
  }, []);

  const logout = useCallback(() => {
    for (const name of [AUTH_COOKIE, ROLE_COOKIE, NAME_COOKIE]) {
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
        isLoading,
        isAuthenticated: Boolean(user),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
