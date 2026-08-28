"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, XCircle } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/components/Button";
import { acceptInterest, rejectInterest } from "@/features/interests/lib/interest";
import { cn } from "@/shared/utils";
import { useDialogFocus } from "@/shared/hooks/use-dialog-focus";

const MAX_REASON = 500;

/**
 * InterestButtons — US-044 (T047).
 *
 * Accept / Reject pair for an idea-owner received-interest card. Both actions
 * open a confirmation dialog (accept confirms the PDF agreement + email
 * disclosure; reject collects an optional ≤500-char reason). The pair is
 * disabled once the request is no longer pending, and a cancelled request
 * shows the investor-cancelled note instead of the buttons.
 */
export function InterestButtons({ interest, onStatusChange }) {
  const t = useTranslations("interests");
  const [action, setAction] = useState(null); // "accept" | "reject"
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Focus trap for the accept/reject dialog: move focus in on open, cycle Tab,
  // close on Escape, restore focus to the trigger on close.
  const { containerRef: actionDialogRef } = useDialogFocus({
    open: Boolean(action),
    onClose: close,
  });

  if (interest.status === "cancelled") {
    return (
      <p role="status" className="text-sm font-medium text-text-secondary">
        {t("buttons.cancelledNote")}
      </p>
    );
  }

  const isPending = interest.status === "pending";
  const disabled = !isPending || submitting;

  function close() {
    setAction(null);
    setReason("");
    setError("");
  }

  async function confirm() {
    if (!action) return;
    setSubmitting(true);
    setError("");
    try {
      const res =
        action === "accept"
          ? await acceptInterest(interest.id)
          : await rejectInterest(interest.id, reason);
      onStatusChange?.(interest.id, res);
      close();
    } catch (err) {
      setError(
        err.body?.message ??
          (action === "accept" ? t("errors.acceptFailed") : t("errors.rejectFailed"))
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setError("");
            setAction("accept");
          }}
          disabled={disabled}
        >
          <CheckCircle size={16} weight="bold" aria-hidden />
          {t("buttons.accept")}
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => {
            setError("");
            setAction("reject");
          }}
          disabled={disabled}
        >
          <XCircle size={16} weight="bold" aria-hidden />
          {t("buttons.reject")}
        </Button>
      </div>

      <AnimatePresence>
        {action && (
          <motion.div
            className="fixed inset-0 z-100 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="presentation"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={close} aria-hidden />
            <motion.div
              ref={actionDialogRef}
              role="alertdialog"
              aria-modal="true"
              tabIndex={-1}
              aria-labelledby="interest-action-title"
              aria-describedby="interest-action-desc"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-md rounded-2xl border border-border bg-surface-0 p-6 shadow-xl"
            >
              <span
                className={cn(
                  "mx-auto flex h-14 w-14 items-center justify-center rounded-full",
                  action === "accept" ? "bg-accent-100" : "bg-tint-danger"
                )}
              >
                {action === "accept" ? (
                  <CheckCircle size={28} weight="bold" className="text-success" aria-hidden />
                ) : (
                  <XCircle size={28} weight="bold" className="text-danger" aria-hidden />
                )}
              </span>
              <h2
                id="interest-action-title"
                className="mt-4 text-center font-heading text-lg font-bold text-text-primary"
              >
                {action === "accept"
                  ? t("buttons.confirmAcceptTitle")
                  : t("buttons.confirmRejectTitle")}
              </h2>
              <p
                id="interest-action-desc"
                className="mt-2 text-center text-sm leading-relaxed text-text-secondary"
              >
                {action === "accept"
                  ? t("buttons.confirmAcceptBody")
                  : t("buttons.confirmRejectBody")}
              </p>

              {action === "reject" && (
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <label
                      htmlFor="rejection-reason"
                      className="text-sm font-medium text-text-primary"
                    >
                      {t("buttons.rejectionReasonLabel")}
                    </label>
                    <span className="text-xs tabular-nums text-text-secondary">
                      {reason.length}/{MAX_REASON}
                    </span>
                  </div>
                  <textarea
                    id="rejection-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON))}
                    rows={3}
                    maxLength={MAX_REASON}
                    placeholder={t("buttons.rejectionReasonPlaceholder")}
                    className="w-full rounded-lg border border-border bg-surface-0 px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-primary-600 focus:outline-none"
                  />
                </div>
              )}

              {error && (
                <p role="alert" className="mt-3 text-center text-sm font-medium text-danger">
                  {error}
                </p>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
                <Button variant="secondary" onClick={close} disabled={submitting}>
                  {t("buttons.cancel")}
                </Button>
                <Button
                  variant={action === "accept" ? "primary" : "danger"}
                  loading={submitting}
                  onClick={confirm}
                >
                  {t("buttons.confirm")}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
