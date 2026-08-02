"use client";

import { useState } from "react";
import { Eye, EyeSlash, Lock, WarningCircle } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { cn } from "@/lib/utils";

const inputClasses =
  "w-full rounded-lg border border-border bg-surface-1 px-4 py-3 ps-11 text-text-primary placeholder:text-text-secondary/70 transition focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20";

/** Demo login — sets the auth cookies the middleware checks (Laravel will do this for real). */
function mockLogin(name: string, role: "owner" | "investor", remember: boolean) {
  const maxAge = remember ? "max-age=2592000" : "max-age=86400";
  document.cookie = `ihyaa_token=demo;path=/;${maxAge};samesite=lax`;
  document.cookie = `ihyaa_role=${role};path=/;${maxAge};samesite=lax`;
  document.cookie = `ihyaa_name=${encodeURIComponent(name)};path=/;${maxAge};samesite=lax`;
  localStorage.setItem("ihyaa_user", JSON.stringify({ name, role }));
}

export default function LoginPage() {
  const t = useTranslations("auth");
  const common = useTranslations("common");
  const toast = useToast();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t("errors.invalidEmail"));
      return;
    }
    if (password.length < 6) {
      setError(t("errors.shortPassword"));
      return;
    }

    setLoading(true);
    // Simulate an API round-trip; replace with POST /api/v1/login in Sprint 1.
    window.setTimeout(() => {
      const name = email.split("@")[0] === "investor" ? "Investor Demo" : "صاحب فكرة";
      const role = email.includes("investor") ? ("investor" as const) : ("owner" as const);
      mockLogin(name, role, remember);
      toast.success(t("loginSuccess"));
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next && !next.startsWith("/login") ? next : `/dashboard/${role}`);
    }, 600);
  }

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold">{t("loginTitle")}</h1>
      <p className="mt-2 text-text-secondary">{t("loginSubtitle")}</p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        {/* Email */}
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-primary">
            {t("email")}
          </label>
          <div className="relative">
            <span aria-hidden className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4 text-text-secondary">
              <Lock size={18} />
            </span>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className={inputClasses}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-text-primary">
              {t("password")}
            </label>
            <Link
              href="/forgot-password"
              className="min-h-6 text-sm font-medium text-primary-600 hover:underline"
            >
              {t("forgotPassword")}
            </Link>
          </div>
          <div className="relative">
            <span aria-hidden className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4 text-text-secondary">
              <Lock size={18} />
            </span>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={cn(inputClasses, "pe-12")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? t("hidePassword") : t("showPassword")}
              className="absolute inset-y-0 end-0 flex w-12 items-center justify-center text-text-secondary hover:text-text-primary"
            >
              {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Remember me */}
        <label className="flex min-h-12 cursor-pointer items-center gap-3 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-5 w-5 rounded border-border accent-primary-600"
          />
          {t("rememberMe")}
        </label>

        {error && (
          <p role="alert" className="flex items-center gap-2 rounded-lg bg-tint-danger px-4 py-3 text-sm text-danger-ink">
            <WarningCircle size={18} weight="bold" />
            {error}
          </p>
        )}

        <Button type="submit" fullWidth size="lg" loading={loading}>
          {t("loginButton")}
        </Button>
      </form>

      {/* Divider */}
      <div className="my-6 flex items-center gap-4 text-xs text-text-secondary" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        {t("or")}
        <span className="h-px flex-1 bg-border" />
      </div>

      <OAuthButtons />

      <p className="mt-6 text-center text-sm text-text-secondary">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-semibold text-primary-600 hover:underline">
          {t("createAccount")}
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-text-secondary">{common("demoNote")}</p>
    </div>
  );
}
