"use client";

import { useEffect } from "react";
import { ArrowCounterClockwise, WarningCircle } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/components/Button";

/** Global error boundary for every page under [locale].
 *  `reset` re-renders the failed segment without a full reload. */
export default function LocaleError({ error, reset }) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div
      role="alert"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 py-16 text-center"
    >
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-tint-danger">
        <WarningCircle size={32} weight="light" className="text-danger" aria-hidden />
      </span>
      <h1 className="font-heading text-2xl font-bold text-text-primary">{t("title")}</h1>
      <p className="max-w-md text-sm leading-relaxed text-text-secondary">
        {t("description")}
      </p>
      {error.digest && (
        <p className="text-xs text-text-secondary/70" dir="ltr">
          {error.digest}
        </p>
      )}
      <Button size="lg" onClick={reset} className="mt-2">
        <ArrowCounterClockwise size={20} weight="bold" />
        {t("retry")}
      </Button>
    </div>
  );
}
