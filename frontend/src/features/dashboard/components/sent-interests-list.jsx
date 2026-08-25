"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DownloadSimple, PaperPlaneTilt, XCircle } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/components/Button";
import { RelativeTime } from "@/features/notifications/components/RelativeTime";
import { Link } from "@/config/i18n/link";
import {
  cancelSentInterest,
  fetchAgreementPdf,
} from "@/features/interests/lib/interest";
import { cn } from "@/shared/utils";
import { useToast } from "@/shared/components/Toast";

/**
 * EPIC-11 · Sent-interests widget (US-058 · T090/T091) — dashboard-api.md §2.sent_interests.
 *
 * Each row shows the project (link), sent time, interest type, status badge,
 * and — per contract — a cancel button only when `can_cancel` (pending only)
 * plus a PDF download for `agreement_available` (accepted with a signed PDF).
 * A cancelled request surfaces its rejection reason, falling back to
 * «لم يحدد صاحب المشروع سبباً» when the owner gave none.
 *
 * الدستور III — RTL: no hard-coded text, everything through next-intl.
 */

const STATUS_META = {
  pending: "bg-tint-warning text-warning-ink",
  accepted: "bg-tint-success text-success-ink",
  accepted_pending_document: "bg-tint-warning text-warning-ink",
  rejected: "bg-tint-danger text-danger-ink",
  cancelled: "bg-surface-2 text-text-secondary",
};

/** /api/agreements/{id} → the trailing {id}. */
function agreementIdFromUrl(url) {
  if (!url) return null;
  const parts = String(url).split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  return /^\d+$/.test(last) ? Number(last) : last;
}

export function SentInterestsList({ items, onCancelled, className }) {
  const t = useTranslations("dashboard");
  const ti = useTranslations("interests");
  const toast = useToast();
  const list = Array.isArray(items) ? items : [];

  const [cancellingId, setCancellingId] = useState(null); // interest id in the dialog
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  // Close the confirmation dialog on Escape.
  useEffect(() => {
    if (cancellingId === null) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeDialog();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancellingId]);

  function closeDialog() {
    setCancellingId(null);
    setError("");
  }

  async function confirmCancel() {
    if (cancellingId === null) return;
    setSubmitting(true);
    setError("");
    try {
      await cancelSentInterest(cancellingId);
      toast.success(t("investor.cancelSuccess"));
      onCancelled?.(cancellingId);
      closeDialog();
    } catch (err) {
      setError(err.body?.message ?? t("investor.cancelFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function downloadAgreement(row) {
    const id = agreementIdFromUrl(row.agreement_url);
    if (!id) return;
    setDownloading(true);
    try {
      const url = await fetchAgreementPdf(id);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toast.error(t("investor.viewAgreementFailed"));
    } finally {
      setDownloading(false);
    }
  }

  if (list.length === 0) {
    return (
      <section className={cn("rounded-xl border border-border bg-surface-1 shadow-sm", className)}>
        <SectionTitle />
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-100">
            <PaperPlaneTilt size={28} weight="light" className="text-primary-600" aria-hidden />
          </span>
          <p className="font-heading font-semibold text-text-primary">
            {t("investor.sentInterestsEmpty")}
          </p>
          <p className="max-w-sm text-sm text-text-secondary">
            {t("investor.sentInterestsEmptyDesc")}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("rounded-xl border border-border bg-surface-1 shadow-sm", className)}>
      <SectionTitle />
      <ul className="divide-y divide-border/60">
        {list.map((row) => {
          const status = row.status ?? "pending";
          const projectId = row.project?.id;
          const projectTitle = row.project?.title ?? "—";
          const reason =
            row.rejection_reason?.trim() || t("investor.noRejectionReason");
          const showReason = status === "rejected" || status === "cancelled";
          return (
            <li key={row.id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/projects/${projectId}`}
                      className="truncate font-heading font-semibold text-text-primary transition-colors hover:text-primary-600"
                    >
                      {projectTitle}
                    </Link>
                    <span className="rounded-full bg-accent-100/70 px-2.5 py-0.5 text-[11px] font-semibold text-primary-700">
                      {ti(`types.${row.interest_type}`)}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                        STATUS_META[status] ?? "bg-surface-2 text-text-secondary"
                      )}
                    >
                      {ti(`status.${status}`)}
                    </span>
                  </div>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-text-secondary/80">
                    <PaperPlaneTilt size={12} aria-hidden />
                    <RelativeTime date={row.sent_at} />
                  </p>
                  {showReason && (
                    <p className="mt-2 text-sm text-text-secondary">
                      <span className="font-medium text-text-primary">
                        {ti("sent.rejectionReason")}:
                      </span>{" "}
                      {reason}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {row.agreement_available && row.agreement_url && (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={downloading}
                      onClick={() => downloadAgreement(row)}
                    >
                      <DownloadSimple size={16} aria-hidden />
                      {t("investor.viewAgreement")}
                    </Button>
                  )}
                  {row.can_cancel && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        setError("");
                        setCancellingId(row.id);
                      }}
                    >
                      <XCircle size={16} weight="bold" aria-hidden />
                      {t("investor.cancelInterest")}
                    </Button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Cancel confirmation dialog (T091) */}
      <AnimatePresence>
        {cancellingId !== null && (
          <motion.div
            className="fixed inset-0 z-100 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="presentation"
          >
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={closeDialog}
              aria-hidden
            />
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="cancel-interest-title"
              aria-describedby="cancel-interest-desc"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-md rounded-2xl border border-border bg-surface-0 p-6 shadow-xl"
            >
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-tint-danger">
                <XCircle size={28} weight="bold" className="text-danger" aria-hidden />
              </span>
              <h2
                id="cancel-interest-title"
                className="mt-4 text-center font-heading text-lg font-bold text-text-primary"
              >
                {ti("confirmCancel.title")}
              </h2>
              <p
                id="cancel-interest-desc"
                className="mt-2 text-center text-sm leading-relaxed text-text-secondary"
              >
                {ti("confirmCancel.body")}
              </p>

              {error && (
                <p role="alert" className="mt-3 text-center text-sm font-medium text-danger">
                  {error}
                </p>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
                <Button variant="secondary" onClick={closeDialog} disabled={submitting}>
                  {ti("confirmCancel.cancel")}
                </Button>
                <Button variant="danger" loading={submitting} onClick={confirmCancel}>
                  {ti("confirmCancel.confirm")}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function SectionTitle() {
  const t = useTranslations("dashboard");
  return (
    <h2 className="flex items-center gap-2 border-b border-border px-4 py-3 font-heading text-base font-bold text-text-primary">
      <PaperPlaneTilt size={18} className="text-primary-600" aria-hidden />
      {t("investor.sentInterestsTitle")}
    </h2>
  );
}
