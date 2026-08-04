"use client";

import { useState } from "react";
import { CheckCircle, Lightbulb, Wallet, WarningCircle } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/config/i18n/link";
import { Button } from "@/shared/components/Button";
import { useToast } from "@/shared/components/Toast";
import { OAuthButtons } from "@/features/auth/components/OAuthButtons";
import { api } from "@/shared/lib/api";
import { cn } from "@/shared/utils";

const inputClasses =
  "w-full rounded-lg border border-border bg-surface-1 px-4 py-3 text-text-primary placeholder:text-text-secondary/70 transition focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20";

/** Simple entropy-based strength meter (0–4). */
function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) || /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

export default function RegisterPage() {
  const t = useTranslations("auth");
  const toast = useToast();
  const router = useRouter();

  const [role, setRole] = useState("idea_owner");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const strength = passwordStrength(password);
  const strengthLabels = [
    t("strength.weak"),
    t("strength.weak"),
    t("strength.fair"),
    t("strength.good"),
    t("strength.strong"),
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) return setError(t("errors.shortName"));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError(t("errors.invalidEmail"));
    if (password.length < 6) return setError(t("errors.shortPassword"));
    if (!terms) return setError(t("errors.termsRequired"));

    setLoading(true);
    try {
      await api.post("/register", {
        name: name.trim(),
        email,
        password,
        password_confirmation: password,
        role,
      });

      toast.success(t("registerSuccess"));
      router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (err) {
      const body = err.body;
      // Laravel returns validation errors as { errors: { field: [messages] } }
      const msg =
        body?.message ??
        (body?.errors
          ? Object.values(body.errors).flat().join(". ")
          : t("errors.generic"));
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const roles = [
    { key: "idea_owner", icon: Lightbulb, label: t("roleOwner"), description: t("roleOwnerDesc") },
    { key: "investor", icon: Wallet, label: t("roleInvestor"), description: t("roleInvestorDesc") },
  ];

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold">{t("registerTitle")}</h1>
      <p className="mt-2 text-text-secondary">{t("registerSubtitle")}</p>

      {/* Role tabs */}
      <div className="mt-6 grid grid-cols-2 gap-3" role="radiogroup" aria-label={t("chooseRole")}>
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

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-text-primary">
            {t("fullName")}
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("fullNamePlaceholder")}
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-primary">
            {t("email")}
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-primary">
            {t("password")}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputClasses}
          />
          {/* Strength meter */}
          <div className="mt-2 flex items-center gap-3" aria-live="polite">
            <div className="flex flex-1 gap-1" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    i < strength ? "bg-primary-500" : "bg-border"
                  )}
                />
              ))}
            </div>
            {password && (
              <span className="text-xs font-medium text-text-secondary">
                {strengthLabels[strength]}
              </span>
            )}
          </div>
        </div>

        <label className="flex min-h-12 cursor-pointer items-start gap-3 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-border accent-primary-600"
          />
          <span>
            {t("termsPrefix")}{" "}
            <Link href="/#" className="font-medium text-primary-600 hover:underline">
              {t("termsLink")}
            </Link>
          </span>
        </label>

        {error && (
          <p role="alert" className="flex items-center gap-2 rounded-lg bg-tint-danger px-4 py-3 text-sm text-danger-ink">
            <WarningCircle size={18} weight="bold" />
            {error}
          </p>
        )}

        <Button type="submit" fullWidth size="lg" loading={loading}>
          {t("createAccountButton")}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-4 text-xs text-text-secondary" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        {t("or")}
        <span className="h-px flex-1 bg-border" />
      </div>

      <OAuthButtons />

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-sm text-text-secondary">
        <CheckCircle size={16} className="text-success" aria-hidden />
        {t("noEmailNeeded")}
      </p>

      <p className="mt-2 text-center text-sm text-text-secondary">
        {t("hasAccount")}{" "}
        <Link href="/login" className="font-semibold text-primary-600 hover:underline">
          {t("loginLink")}
        </Link>
      </p>
    </div>
  );
}
