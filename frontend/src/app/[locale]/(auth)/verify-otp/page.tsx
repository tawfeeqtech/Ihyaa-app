"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, ShieldCheck, Timer } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

const OTP_LENGTH = 6;
/** OTP validity: 1 minute per design-decisions.md §4. */
const OTP_TTL_SECONDS = 60;

export default function VerifyOtpPage() {
  const t = useTranslations("auth");
  const toast = useToast();
  const router = useRouter();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_SECONDS);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const expired = secondsLeft === 0;
  const complete = digits.every((d) => d !== "");

  /* 60-second countdown for the OTP. */
  useEffect(() => {
    if (expired) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [expired]);

  function handleChange(index: number, value: string) {
    const clean = value.replace(/\D/g, "");
    setError(null);
    setDigits((prev) => {
      const next = [...prev];
      // Support paste of multiple digits.
      const chars = clean.split("");
      chars.forEach((ch, i) => {
        if (index + i < OTP_LENGTH) next[index + i] = ch;
      });
      return next;
    });
    // Focus the next empty input.
    const nextIndex = index + clean.length;
    if (nextIndex < OTP_LENGTH) {
      inputsRef.current[nextIndex]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && digits[index] === "" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handleVerify() {
    if (!complete) {
      setError(t("errors.otpIncomplete"));
      return;
    }
    setVerifying(true);
    // Simulate OTP verification; replace with POST /api/v1/verify-otp in Sprint 1.
    window.setTimeout(() => {
      setVerifying(false);
      toast.success(t("otpVerified"));
      router.push("/login");
    }, 700);
  }

  function handleResend() {
    setDigits(Array(OTP_LENGTH).fill(""));
    setError(null);
    setSecondsLeft(OTP_TTL_SECONDS);
    toast.success(t("otpResent"));
    inputsRef.current[0]?.focus();
  }

  return (
    <div>
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-100 shadow-glow">
        <ShieldCheck size={32} weight="light" className="text-primary-600" />
      </span>
      <h1 className="mt-6 text-center font-heading text-3xl font-bold">{t("otpTitle")}</h1>
      <p className="mx-auto mt-2 max-w-sm text-center text-text-secondary">
        {t("otpSubtitle")}
      </p>

      {/* Countdown */}
      <div
        className={cn(
          "mx-auto mt-6 flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold",
          expired ? "bg-tint-danger text-danger-ink" : "bg-accent-100 text-primary-600"
        )}
        role="timer"
        aria-live="polite"
        aria-label={t("otpCountdownLabel")}
      >
        <Timer size={18} weight="bold" />
        {expired ? t("otpExpired") : `00:${String(secondsLeft).padStart(2, "0")}`}
      </div>

      {/* OTP inputs */}
      <div className="mt-8 flex justify-center gap-2 sm:gap-3" dir="ltr">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={OTP_LENGTH}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            aria-label={`${t("otpDigit")} ${i + 1}`}
            className={cn(
              "h-14 w-11 rounded-lg border border-border bg-surface-1 text-center font-heading text-xl font-bold text-text-primary transition focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20 sm:h-16 sm:w-14",
              digit && "border-primary-500"
            )}
          />
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-5 text-center text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-8 space-y-3">
        <Button fullWidth size="lg" onClick={handleVerify} loading={verifying} disabled={!complete && !verifying}>
          {t("verifyButton")}
        </Button>

        {expired ? (
          <Button fullWidth variant="secondary" onClick={handleResend}>
            {t("resendOtp")}
          </Button>
        ) : (
          <p className="text-center text-sm text-text-secondary">
            {t("otpHelp")}{" "}
            <button
              type="button"
              onClick={handleResend}
              className="font-semibold text-primary-600 hover:underline"
            >
              {t("resendOtp")}
            </button>
          </p>
        )}
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-sm text-text-secondary">
        <CheckCircle size={16} className="text-success" aria-hidden />
        {t("otpSecurityNote")}
      </p>

      <p className="mt-3 text-center text-sm text-text-secondary">
        <Link href="/login" className="font-semibold text-primary-600 hover:underline">
          {t("backToLogin")}
        </Link>
      </p>
    </div>
  );
}
