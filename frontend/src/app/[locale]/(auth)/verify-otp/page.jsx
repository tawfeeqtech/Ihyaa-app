"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { CheckCircle, ShieldCheck, Timer } from "@phosphor-icons/react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/config/i18n/link";
import { Button } from "@/shared/components/Button";
import { useToast } from "@/shared/components/Toast";
import { api } from "@/shared/lib/api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { EMAIL_COOKIE, readCookie } from "@/features/auth/context/AuthProvider";
import { cn } from "@/shared/utils";

const OTP_LENGTH = 6;
/** OTP validity: 1 minute per design-decisions.md §4. */
const OTP_TTL_SECONDS = 60;

/**
 * Map a backend OTP error to a user-facing translated message.
 * Laravel throttle 429 responses carry a `Retry-After` header (seconds).
 */
function mapOtpError(err, t) {
  const code = err?.body?.code;
  if (code === "OTP_EXPIRED") return t("errors.otpExpired");
  if (code === "OTP_INVALID") return t("errors.otpInvalid");
  if (code === "OTP_BLOCKED") return t("errors.otpBlocked");
  if (err?.status === 429) {
    const retry = err.headers?.get?.("Retry-After");
    return retry
      ? t("errors.otpRateLimited", { seconds: retry })
      : t("errors.otpRateLimitedGeneric");
  }
  return err?.body?.message ?? t("errors.generic");
}

function VerifyOtpForm() {
  const t = useTranslations("auth");
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  // email passes as ?email=... from the register flow (T125), or falls back to
  // the `ihyaa_email` cookie when the user is redirected here by the middleware
  // / guard / API client (old unverified session with a stale token).
  const email = searchParams.get("email") ?? readCookie(EMAIL_COOKIE) ?? "";

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_SECONDS);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState(null);
  const inputsRef = useRef([]);

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

  function handleChange(index, value) {
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

  function handleKeyDown(index, e) {
    if (e.key === "Backspace" && digits[index] === "" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  async function handleVerify() {
    if (!complete) {
      setError(t("errors.otpIncomplete"));
      return;
    }
    if (!email) {
      setError(t("errors.otpEmailMissing"));
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      // الدستور V · T124: register لا يُصدر توكن — التوكن يأتي هنا عند التفعيل الناجح.
      const data = await api.post("/email/verify", {
        email,
        code: digits.join(""),
      });

      if (data?.token && data?.user) {
        login(data.token, data.user, false);
        toast.success(t("otpVerified"));
        const dashboardPath =
          data.user.role === "investor"
            ? "/dashboard/investor"
            : "/dashboard/owner";
        router.push(dashboardPath);
        return;
      }

      // Already verified — the public endpoint never issues a token on this
      // path (safe), so send the user to sign in normally.
      toast.success(t("errors.otpAlreadyVerified"));
      router.push("/login");
    } catch (err) {
      setError(mapOtpError(err, t));
      // A wrong/expired/blocked code must be re-entered after the OTP resets.
      const code = err?.body?.code;
      if (
        code === "OTP_INVALID" ||
        code === "OTP_EXPIRED" ||
        code === "OTP_BLOCKED" ||
        err?.status === 429
      ) {
        setDigits(Array(OTP_LENGTH).fill(""));
        inputsRef.current[0]?.focus();
      }
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (!email) {
      setError(t("errors.otpEmailMissing"));
      return;
    }
    setResending(true);
    setError(null);
    try {
      await api.post("/email/resend", { email });
      setDigits(Array(OTP_LENGTH).fill(""));
      setSecondsLeft(OTP_TTL_SECONDS);
      toast.success(t("otpResent"));
      inputsRef.current[0]?.focus();
    } catch (err) {
      setError(mapOtpError(err, t));
    } finally {
      setResending(false);
    }
  }

  // Opened without ?email= (e.g. direct navigation) — friendly dead-end.
  if (!email) {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-100 shadow-glow">
          <ShieldCheck size={32} weight="light" className="text-primary-600" />
        </span>
        <h1 className="mt-6 font-heading text-3xl font-bold">{t("otpTitle")}</h1>
        <p role="alert" className="mx-auto mt-2 max-w-sm text-center text-danger">
          {t("errors.otpEmailMissing")}
        </p>
        <div className="mt-8">
          <Button fullWidth size="lg" onClick={() => router.push("/register")}>
            {t("createAccountButton")}
          </Button>
        </div>
        <p className="mt-3 text-center text-sm text-text-secondary">
          <Link href="/login" className="font-semibold text-primary-600 hover:underline">
            {t("backToLogin")}
          </Link>
        </p>
      </div>
    );
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
          <Button fullWidth variant="secondary" onClick={handleResend} loading={resending}>
            {t("resendOtp")}
          </Button>
        ) : (
          <p className="text-center text-sm text-text-secondary">
            {t("otpHelp")}{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="font-semibold text-primary-600 hover:underline disabled:opacity-60"
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

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpForm />
    </Suspense>
  );
}
