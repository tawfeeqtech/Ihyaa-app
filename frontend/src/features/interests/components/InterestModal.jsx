"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/shared/components/Button";
import { cn } from "@/shared/utils";
import { sendInterest } from "@/features/interests/lib/interest";
import { useDialogFocus } from "@/shared/hooks/use-dialog-focus";

const INTEREST_TYPES = ["investment", "technical_development", "consultation"];
const MAX_MESSAGE = 500;

/**
 * InterestModal — US-042 (T036).
 *
 * Express-interest dialog shown on the project detail page. Three mandatory
 * interest types (investment / technical_development / consultation), a
 * 500-char message counter that blocks excess input, inline validation
 * ("يرجى اختيار نوع الاهتمام") and a network-error retry that preserves the
 * typed message. Matches the re-evaluate dialog a11y pattern (role=alertdialog).
 */
export function InterestModal({ open, project, onClose, onSent }) {
  const t = useTranslations("interests");
  const locale = useLocale();

  // Focus trap for the dialog: move focus in on open, cycle Tab, close on
  // Escape, restore focus to the trigger (the "interested" button) on close.
  const { containerRef: dialogRef } = useDialogFocus({ open, onClose });

  const [interestType, setInterestType] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const projectTitle =
    project?.title && typeof project.title === "object"
      ? locale === "ar"
        ? project.title.ar
        : project.title.en
      : (project?.title ?? "");

  // The dialog content is unmounted when closed (`{open && …}` inside
  // AnimatePresence), so the form state resets naturally on every open.

  function handleMessageChange(e) {
    const raw = e.target.value;
    if (raw.length > MAX_MESSAGE) setMessage(raw.slice(0, MAX_MESSAGE));
    else setMessage(raw);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setValidationError("");
    setSubmitError("");

    if (!interestType) {
      setValidationError(t("modal.typeRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await sendInterest(project.id, {
        interest_type: interestType,
        message,
      });
      onSent?.(res);
      onClose();
    } catch (err) {
      const code = err.body?.code;
      if (code === "invalid_type") setValidationError(t("modal.typeRequired"));
      else if (code === "duplicate_interest") setSubmitError(t("errors.duplicate"));
      else if (code === "profile_incomplete") setSubmitError(t("errors.profileIncomplete"));
      else if (code === "project_unavailable") setSubmitError(t("errors.projectUnavailable"));
      else if (code === "self_interest") setSubmitError(t("errors.selfInterest"));
      else setSubmitError(err.body?.message ?? t("errors.network"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-100 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="presentation"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="interest-dialog-title"
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-md rounded-2xl border border-border bg-surface-0 p-6 shadow-xl outline-none"
          >
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-100">
              <PaperPlaneTilt size={28} weight="bold" className="text-primary-600" aria-hidden />
            </span>
            <h2
              id="interest-dialog-title"
              className="mt-4 text-center font-heading text-lg font-bold text-text-primary"
            >
              {t("modal.title")}
            </h2>
            <p className="mt-1 text-center text-sm text-text-secondary">{t("modal.subtitle")}</p>
            <p className="mt-3 truncate text-center text-sm font-semibold text-primary-600">
              {projectTitle}
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-5" noValidate>
              {/* Interest type (3 mandatory options) */}
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-text-primary">
                  {t("modal.typeLabel")}
                </legend>
                <div className="space-y-2" role="radiogroup" aria-label={t("modal.typeLabel")}>
                  {INTEREST_TYPES.map((type) => {
                    const active = interestType === type;
                    return (
                      <label
                        key={type}
                        className={cn(
                          "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
                          active
                            ? "border-primary-600 bg-accent-100"
                            : "border-border bg-surface-0 hover:border-primary-500"
                        )}
                      >
                        <input
                          type="radio"
                          name="interest-type"
                          value={type}
                          checked={active}
                          onChange={() => {
                            setInterestType(type);
                            setValidationError("");
                          }}
                          className="h-4 w-4 accent-primary-600"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-text-primary">
                            {t(`types.${type}`)}
                          </span>
                          <span className="block text-xs text-text-secondary">
                            {t(`types.${type}Desc`)}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                {validationError && (
                  <p role="alert" className="mt-2 text-sm font-medium text-danger">
                    {validationError}
                  </p>
                )}
              </fieldset>

              {/* Message + 500-char counter */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="interest-message" className="text-sm font-medium text-text-primary">
                    {t("modal.messageLabel")}
                  </label>
                  <span className="text-xs tabular-nums text-text-secondary" aria-live="polite">
                    {t("modal.charCount", { count: message.length, max: MAX_MESSAGE })}
                  </span>
                </div>
                <textarea
                  id="interest-message"
                  value={message}
                  onChange={handleMessageChange}
                  rows={4}
                  placeholder={t("modal.messagePlaceholder")}
                  maxLength={MAX_MESSAGE}
                  className="w-full rounded-lg border border-border bg-surface-0 px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-primary-600 focus:outline-none"
                />
              </div>

              {/* Network/API error + retry (preserves the typed message) */}
              {submitError && (
                <div
                  role="alert"
                  className="flex flex-col items-center gap-2 rounded-lg border border-danger/40 bg-tint-danger px-4 py-3 text-sm text-danger-ink"
                >
                  <p className="text-center">{submitError}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {t("errors.retry")}
                  </Button>
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
                <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
                  {t("modal.cancel")}
                </Button>
                <Button type="submit" loading={submitting}>
                  <PaperPlaneTilt size={18} weight="bold" aria-hidden />
                  {submitting ? t("modal.sending") : t("modal.send")}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
