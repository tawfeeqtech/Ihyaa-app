"use client";

import { useState } from "react";
import { GithubLogo, GoogleLogo, LinkedinLogo } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/shared/components/Button";
import { API_BASE_URL } from "@/config";

/**
 * Google / GitHub / LinkedIn OAuth buttons (Laravel Socialite backend).
 *
 * Flow:
 *  1. Frontend calls GET /api/auth/{provider}?redirect_to=... to get the
 *     provider's OAuth consent URL.
 *  2. Browser is redirected to Google / GitHub / LinkedIn.
 *  3. After consent, the provider redirects to the Laravel callback, which
 *     exchanges the code and redirects to /auth/callback with the token.
 *  4. The callback page stores the token and redirects to the dashboard.
 */
export function OAuthButtons() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [loadingKey, setLoadingKey] = useState(null);

  const providers = [
    { key: "google", icon: GoogleLogo },
    { key: "github", icon: GithubLogo },
    { key: "linkedin", icon: LinkedinLogo },
  ];

  async function handleOAuth(provider) {
    setLoadingKey(provider);
    try {
      const redirectTo = `${window.location.origin}/${locale}/auth/callback`;
      const res = await fetch(
        `${API_BASE_URL}/auth/${provider}?redirect_to=${encodeURIComponent(redirectTo)}`
      );
      const body = await res.json();

      if (!res.ok || !body?.data?.redirect_url) {
        throw new Error(body?.message ?? "OAuth redirect failed");
      }

      // Navigate the browser to the provider's consent page.
      window.location.href = body.data.redirect_url;
    } catch {
      setLoadingKey(null);
      // The error is recoverable — user can try again.
    }
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {providers.map(({ key, icon: IconComponent }) => (
        <Button
          key={key}
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => handleOAuth(key)}
          loading={loadingKey === key}
          aria-label={t("continueWith", { provider: t(`providers.${key}`) })}
          className="min-h-12 px-2"
        >
          {loadingKey !== key && (
            <IconComponent size={20} weight="regular" className="text-text-primary" />
          )}
        </Button>
      ))}
    </div>
  );
}
