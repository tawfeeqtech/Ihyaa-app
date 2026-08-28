"use client";

import { useState } from "react";
import { Eye, EyeSlash, Lock, WarningCircle } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/config/i18n/link";
import { Button } from "@/shared/components/Button";
import { useToast } from "@/shared/components/Toast";
import { OAuthButtons } from "@/features/auth/components/OAuthButtons";
import { api } from "@/shared/lib/api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { cn } from "@/shared/utils";

const inputClasses =
  "w-full rounded-lg border border-border bg-surface-1 px-4 py-3 ps-11 text-text-primary placeholder:text-text-secondary/70 transition focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20";

export default function LoginPage() {
  const t = useTranslations("auth");
  const common = useTranslations("common");
  const toast = useToast();
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t("errors.invalidEmail"));
      return;
    }
    if (password.length < 8) {
      setError(t("errors.shortPassword"));
      return;
    }

    setLoading(true);
    try {
      const data = await api.post("/login", {
        email,
        password,
        remember: remember ? 1 : 0,
      });

      login(data.token, data.user, remember);
      toast.success(t("loginSuccess"));

      const next = new URLSearchParams(window.location.search).get("next");
      const dashboardPath =
        data.user.role === "investor"
          ? "/dashboard/investor"
          : "/dashboard/owner";
      router.push(next && !next.startsWith("/login") ? next : dashboardPath);
    } catch (err) {
      // الدستور V: حساب غير مفعّل البريد → وجّه إلى صفحة إدخال رمز التفعيل.
      if (err.body?.code === "EMAIL_NOT_VERIFIED") {
        toast.info(t("errors.emailNotVerified"));
        router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
        return;
      }
      const msg =
        err.body?.message ??
        (err.status === 401
          ? t("errors.invalidCredentials")
          : err.status === 403
            ? t("errors.accountDisabled")
            : t("errors.generic"));
      setError(msg);
    } finally {
      setLoading(false);
    }
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
              className="inline-flex min-h-12 items-center text-sm font-medium text-primary-600 hover:underline"
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
              minLength={8}
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
    </div>
  );
}
