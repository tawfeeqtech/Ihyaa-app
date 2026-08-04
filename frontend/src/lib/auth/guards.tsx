"use client";

import { useEffect } from "react";
import { useRouter } from "@/lib/i18n";
import { useAuth } from "./useAuth";
import { getDashboardHref, type UserRole } from "./AuthProvider";

/** Redirects unauthenticated users to /login. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) return null;
  return <>{children}</>;
}

/** Role guard — redirects mismatched roles to their own dashboard. */
export function RequireRole({
  role,
  children,
}: {
  role: UserRole | UserRole[];
  children: React.ReactNode;
}) {
  const { role: userRole, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !userRole) {
      router.replace("/login");
      return;
    }
    const allowed = Array.isArray(role) ? role : [role];
    if (!allowed.includes(userRole)) {
      router.replace(getDashboardHref(userRole));
    }
  }, [isLoading, isAuthenticated, userRole, role, router]);

  const allowed = Array.isArray(role) ? role : [role];
  if (isLoading || !isAuthenticated || !userRole || !allowed.includes(userRole)) return null;
  return <>{children}</>;
}
