"use client";

import { GithubLogo, GoogleLogo, LinkedinLogo } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

/**
 * Google / GitHub / LinkedIn OAuth buttons (Laravel Socialite backend).
 * MVP demo: shows an info toast instead of hitting the real endpoints.
 */
export function OAuthButtons() {
  const t = useTranslations("auth");
  const toast = useToast();

  const providers = [
    { key: "google", icon: GoogleLogo },
    { key: "github", icon: GithubLogo },
    { key: "linkedin", icon: LinkedinLogo },
  ] as const;

  function handleOAuth(provider: string) {
    toast.info(
      t("oauthDemoTitle", { provider: t(`providers.${provider}`) }),
      t("oauthDemoDescription")
    );
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
          aria-label={t("continueWith", { provider: t(`providers.${key}`) })}
          className="min-h-12 px-2"
        >
          <IconComponent size={20} weight="regular" className="text-text-primary" />
        </Button>
      ))}
    </div>
  );
}
