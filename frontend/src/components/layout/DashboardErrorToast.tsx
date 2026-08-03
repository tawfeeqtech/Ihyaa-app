"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/Toast";

/** Reads `?error=unauthorized_role` (set by the middleware role guard, US-006)
 *  and surfaces it as a toast inside the dashboard shell. */
function UnauthorizedRoleToast() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const t = useTranslations("dashboard");

  useEffect(() => {
    if (searchParams.get("error") === "unauthorized_role") {
      toast.error(t("unauthorizedRole"));
      // Drop the query so a refresh does not re-show the toast.
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState(null, "", url);
    }
  }, [searchParams, toast, t]);

  return null;
}

export function DashboardErrorToast() {
  return (
    <Suspense fallback={null}>
      <UnauthorizedRoleToast />
    </Suspense>
  );
}
