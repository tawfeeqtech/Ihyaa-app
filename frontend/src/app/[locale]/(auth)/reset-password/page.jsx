"use client";

import { Suspense, useState } from "react";
import { CheckCircle, Eye, EyeSlash, Lock, WarningCircle } from "@phosphor-icons/react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/config/i18n/link";
import { Button } from "@/shared/components/Button";
import { useToast } from "@/shared/components/Toast";
import { api } from "@/shared/lib/api";
import { cn } from "@/shared/utils";

const inputClasses =
  "w-full rounded-lg border border-border bg-surface-1 px-4 py-3 ps-11 text-text-primary placeholder:text-text-secondary/70 transition focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20";

/** T138 · US-004 — إعادة تعيين كلمة المرور (POST /reset-password). */
function ResetPasswordForm() {
  const t = useTranslations("auth");
  const toast = useToast();
  const searchParams = useSearchParams();

  // token/email تمرّان عبر رابط إعادة التعيين ?token=...&email=...
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t("resetPasswordMinLength"));
      return;
    }
    if (password !== confirmation) {
      setError(t("passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      await api.post("/reset-password", {
        email,
        token,
        password,
        password_confirmation: confirmation,
      });
      setDone(true);
      toast.success(t("resetSuccessTitle"));
    } catch (err) {
      setError(err.body?.message ?? t("invalidResetToken"));
    } finally {
      setLoading(false);
    }
  }

  // الرابط ناقص token/email — طريق مسدود واضح.
  if (!token || !email) {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-tint-danger">
          <WarningCircle size={32} weight="light" className="text-danger-ink" />
        </span>
        <h1 className="mt-6 font-heading text-3xl font-bold">{t("resetPasswordTitle")}</h1>
        <p role="alert" className="mx-auto mt-2 max-w-sm text-center text-danger">
          {t("resetTokenMissing")}
        </p>
        <div className="mt-8">
          <Link href="/forgot-password" className="block">
            <Button fullWidth size="lg">
              {t("forgotButton")}
            </Button>
          </Link>
        </div>
        <p className="mt-3 text-center text-sm text-text-secondary">
          <Link href="/login" className="font-semibold text-primary-600 hover:underline">
            {t("backToLogin")}
          </Link>
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-tint-success">
          <CheckCircle size={40} weight="light" className="text-success-ink" />
        </span>
        <h1 className="mt-6 font-heading text-2xl font-bold">{t("resetSuccessTitle")}</h1>
        <p className="mt-3 text-text-secondary">{t("resetSuccessDescription")}</p>
        <div className="mt-8">
          <Link href="/login" className="block">
            <Button fullWidth size="lg">
              {t("loginButton")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold">{t("resetPasswordTitle")}</h1>
      <p className="mt-2 text-text-secondary">{t("resetPasswordSubtitle")}</p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-primary">
            {t("newPassword")}
          </label>
          <div className="relative">
            <span aria-hidden className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4 text-text-secondary">
              <Lock size={18} />
            </span>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("newPasswordPlaceholder")}
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

        <div>
          <label htmlFor="confirmation" className="mb-1.5 block text-sm font-medium text-text-primary">
            {t("confirmPassword")}
          </label>
          <div className="relative">
            <span aria-hidden className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4 text-text-secondary">
              <Lock size={18} />
            </span>
            <input
              id="confirmation"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={t("confirmPasswordPlaceholder")}
              className={cn(inputClasses, "pe-12")}
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="flex items-center gap-2 rounded-lg bg-tint-danger px-4 py-3 text-sm text-danger-ink">
            <WarningCircle size={18} weight="bold" />
            {error}
          </p>
        )}

        <Button type="submit" fullWidth size="lg" loading={loading}>
          {t("resetButton")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        <Link href="/login" className="font-semibold text-primary-600 hover:underline">
          {t("backToLogin")}
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
