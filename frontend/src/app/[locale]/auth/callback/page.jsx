"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/config/i18n/link";
import { setAuthCookies } from "@/shared/lib/api";
import { Skeleton } from "@/shared/components/Skeleton";

/**
 * OAuth callback page — receives token from the Laravel backend after a
 * successful OAuth flow (Google / GitHub / LinkedIn).
 *
 * The backend redirects the browser here with query params:
 *   ?token=...&role=...&name=...&role_required=0|1&role_setup_state=...&provider=...
 *
 * On error:
 *   ?error=INVALID_STATE&error_message=...
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const errorCode = params.get("error");
    if (errorCode) {
      setError(params.get("error_message") ?? errorCode);
      return;
    }

    const token = params.get("token");
    const role = params.get("role");
    const name = params.get("name");
    const roleRequired = params.get("role_required") === "1";
    const roleSetupState = params.get("role_setup_state");
    const provider = params.get("provider");

    if (!token) {
      setError("No token received");
      return;
    }

    if (roleRequired || !role) {
      // New OAuth user — needs to pick a role first.
      // Store the token temporarily and redirect to role selection.
      document.cookie = `ihyaa_oauth_token=${token};path=/;max-age=600;samesite=lax`;
      document.cookie = `ihyaa_oauth_provider=${provider};path=/;max-age=600;samesite=lax`;
      document.cookie = `ihyaa_oauth_state=${roleSetupState};path=/;max-age=600;samesite=lax`;
      document.cookie = `ihyaa_oauth_name=${encodeURIComponent(name)};path=/;max-age=600;samesite=lax`;
      router.replace("/auth/select-role");
      return;
    }

    // Existing user with a role — store auth cookies and redirect to dashboard.
    setAuthCookies(token, { role, name });
    const dashboardPath = role === "investor" ? "/dashboard/investor" : "/dashboard/owner";
    router.replace(dashboardPath);
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="font-heading text-2xl font-bold text-text-primary">OAuth Error</h1>
        <p className="text-text-secondary">{error}</p>
        <button
          type="button"
          className="rounded-lg bg-primary-600 px-6 py-3 font-medium text-white hover:bg-primary-500"
          onClick={() => router.push("/login")}
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      <p className="text-text-secondary">Completing authentication...</p>
    </div>
  );
}
