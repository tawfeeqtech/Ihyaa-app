"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/shared/components/Button";
import { useToast } from "@/shared/components/Toast";
import { postReevaluate } from "../lib/evaluation";

/**
 * ReevaluationAlert — "significant changes" prompt after saving an edit (T081 ·
 * SRS-AI-C02).
 *
 * The backend flags `significant_changes: true` on PUT when core fields
 * (title/description/category/team/budget) changed, which invalidates the old
 * AI report. This modal asks the owner whether to re-evaluate now:
 *   "نعم"     → POST /projects/{id}/re-evaluate { confirm: true }
 *   "ليس الآن" → nothing (the project stays as-is; a re-evaluate button is
 *                available on the project page).
 *
 * @param {Object} props
 * @param {boolean}  props.open       Whether the alert is visible.
 * @param {string|number} props.projectId
 * @param {() => void} props.onClose   Dismiss (both "not now" and after success).
 * @param {() => void} [props.onQueued] Called after a re-evaluation is queued.
 */
export function ReevaluationAlert({ open, projectId, onClose, onQueued }) {
  const t = useTranslations("projects");
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const confirm = async () => {
    if (!projectId || submitting) return;
    setSubmitting(true);
    try {
      await postReevaluate(projectId, true);
      toast.success(t("report.reevalQueued"));
      onQueued?.();
      onClose();
    } catch (err) {
      const body = err?.body;
      // 429 COOLDOWN_ACTIVE → body.message already carries the human countdown.
      toast.error(body?.message ?? t("report.reevalFailed"));
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

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
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reeval-alert-title"
            aria-describedby="reeval-alert-desc"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-md rounded-2xl border border-border bg-surface-0 p-6 shadow-xl"
          >
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-tint-warning">
              <WarningCircle size={28} weight="bold" className="text-warning" aria-hidden />
            </span>
            <h2 id="reeval-alert-title" className="mt-4 text-center font-heading text-lg font-bold text-text-primary">
              {t("report.reevalAlertTitle")}
            </h2>
            <p id="reeval-alert-desc" className="mt-2 text-center text-sm leading-relaxed text-text-secondary">
              {t("report.reevalAlertBody")}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
              <Button variant="secondary" onClick={onClose}>
                {t("report.reevalLater")}
              </Button>
              <Button loading={submitting} onClick={confirm}>
                <ArrowClockwise size={18} weight="bold" aria-hidden />
                {t("report.reevalConfirm")}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
