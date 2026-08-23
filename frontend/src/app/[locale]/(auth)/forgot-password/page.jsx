"use client";

import { useState } from "react";
import { Envelope, EnvelopeSimple, WarningCircle } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Link } from "@/config/i18n/link";
import { Button } from "@/shared/components/Button";
import { useToast } from "@/shared/components/Toast";
import { api } from "@/shared/lib/api";

const inputClasses =
  "w-full rounded-lg border border-border bg-surface-1 px-4 py-3 ps-11 text-text-primary placeholder:text-text-secondary/70 transition focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20";

/**
 * T138 · US-004 — نسيت كلمة المرور.
 * يرسل POST /forgot-password (رابط إعادة تعيين عبر البريد) ثم يعرض نجاحاً.
 * ملاحظة: الخادم لا يكشف وجود البريد — استجابة موحّدة في كل الأحوال.
 */
export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t("errors.invalidEmail"));
      return;
    }

    setLoading(true);
    try {
      await api.post("/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err.body?.message ?? t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setLoading(true);
    try {
      await api.post("/forgot-password", { email });
      toast.info(t("forgotResent"));
    } catch (err) {
      toast.error(err.body?.message ?? t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-tint-success">
          <EnvelopeSimple size={36} weight="light" className="text-success-ink" />
        </span>
        <h1 className="mt-6 font-heading text-2xl font-bold">{t("forgotLinkSentTitle")}</h1>
        <p className="mt-3 text-text-secondary">
          {t("forgotLinkSentDescription", { email })}
        </p>
        <p className="mt-2 text-sm text-text-secondary">{t("checkInbox")}</p>
        <div className="mt-8 space-y-3">
          <Button fullWidth size="lg" variant="secondary" onClick={handleResend} loading={loading}>
            {t("resendEmail")}
          </Button>
          <Link href="/login" className="block">
            <Button fullWidth variant="ghost">
              {t("backToLogin")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold">{t("forgotTitle")}</h1>
      <p className="mt-2 text-text-secondary">{t("forgotSubtitle")}</p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-primary">
            {t("email")}
          </label>
          <div className="relative">
            <span aria-hidden className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4 text-text-secondary">
              <Envelope size={18} />
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

        {error && (
          <p role="alert" className="flex items-center gap-2 rounded-lg bg-tint-danger px-4 py-3 text-sm text-danger-ink">
            <WarningCircle size={18} weight="bold" />
            {error}
          </p>
        )}

        <Button type="submit" fullWidth size="lg" loading={loading}>
          {t("forgotButton")}
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
