"use client";

import { useEffect, useState } from "react";
import { Lightbulb, Wallet, WarningCircle } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/components/Button";
import { api, setAuthCookies } from "@/shared/lib/api";
import { cn } from "@/shared/utils";

/**
 * Role selection page for OAuth users who haven't chosen a role yet (SRS-F01-07).
 * Reads temporary OAuth cookies set by the callback page, then calls
 * POST /api/auth/{provider}/role to finalize.
 */
export default function SelectRolePage() {
  const t = useTranslations("auth");
  const [role, setRole] = useState("idea_owner");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [oauthData, setOauthData] = useState(null);

  useEffect(() => {
    const token = document.cookie.match(/(?:^|; )ihyaa_oauth_token=([^;]*)/)?.[1];
    const provider = document.cookie.match(/(?:^|; )ihyaa_oauth_provider=([^;]*)/)?.[1];
    const state = document.cookie.match(/(?:^|; )ihyaa_oauth_state=([^;]*)/)?.[1];
    const name = document.cookie.match(/(?:^|; )ihyaa_oauth_name=([^;]*)/)?.[1];

    const locale = window.location.pathname.split("/")[1] || "ar";

    if (!token || !provider) {
      window.location.replace(`/${locale}/login`);
      return;
    }

    // Store the token as the real auth cookie so the API client can use it
    document.cookie = `ihyaa_token=${token};path=/;max-age=600;samesite=lax`;
    setOauthData({ token, provider, state: state ?? "", name: name ? decodeURIComponent(name) : "User" });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!oauthData) return;

    setLoading(true);
    setError(null);

    try {
      await api.post(`/auth/${oauthData.provider}/role`, {
        role,
        state: oauthData.state,
      });

      // Clean up temporary OAuth cookies
      for (const name of ["ihyaa_oauth_token", "ihyaa_oauth_provider", "ihyaa_oauth_state", "ihyaa_oauth_name"]) {
        document.cookie = `${name}=;path=/;max-age=0`;
      }

      // Set proper auth cookies
      setAuthCookies(oauthData.token, { role, name: oauthData.name });

      const locale = window.location.pathname.split("/")[1] || "ar";
      const dashboardPath =
        role === "investor"
          ? `/${locale}/dashboard/investor`
          : `/${locale}/dashboard/owner`;
      window.location.replace(dashboardPath);
    } catch (err) {
      setError(err.body?.message ?? t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  if (!oauthData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  const roles = [
    { key: "idea_owner", icon: Lightbulb, label: t("roleOwner"), description: t("roleOwnerDesc") },
    { key: "investor", icon: Wallet, label: t("roleInvestor"), description: t("roleInvestorDesc") },
  ];

  return (
    <div className="mx-auto max-w-md py-16">
      <h1 className="font-heading text-2xl font-bold">{t("chooseRole")}</h1>
      <p className="mt-2 text-text-secondary">
        {t("oauthRolePrompt", { provider: t(`providers.${oauthData.provider}`) })}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={t("chooseRole")}>
          {roles.map(({ key, icon: IconComponent, label, description }) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={role === key}
              onClick={() => setRole(key)}
              className={cn(
                "flex min-h-28 flex-col items-start gap-1.5 rounded-xl border p-4 text-start transition-all duration-300",
                role === key
                  ? "border-primary-600 bg-accent-100 shadow-glow"
                  : "border-border bg-surface-1 hover:border-primary-500"
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  role === key ? "bg-primary-600 text-white" : "bg-surface-0 text-text-secondary"
                )}
              >
                <IconComponent size={20} weight={role === key ? "fill" : "regular"} />
              </span>
              <span className="font-heading text-sm font-semibold text-text-primary">{label}</span>
              <span className="text-xs leading-relaxed text-text-secondary">{description}</span>
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="flex items-center gap-2 rounded-lg bg-tint-danger px-4 py-3 text-sm text-danger-ink">
            <WarningCircle size={18} weight="bold" />
            {error}
          </p>
        )}

        <Button type="submit" fullWidth size="lg" loading={loading}>
          {t("continueButton")}
        </Button>
      </form>
    </div>
  );
}
