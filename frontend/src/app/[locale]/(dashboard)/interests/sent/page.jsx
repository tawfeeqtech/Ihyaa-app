"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EnvelopeSimple, LinkSimple, PaperPlaneTilt, Warning } from "@phosphor-icons/react";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/config/i18n/link";
import { Button } from "@/shared/components/Button";
import { useToast } from "@/shared/components/Toast";
import { cn } from "@/shared/utils";
import { AIScoreBadge } from "@/features/projects/components/AIScoreBadge";
import { InterestBoard } from "@/features/interests/components/InterestBoard";
import { cancelInterest, fetchSent, mapApiInterest } from "@/features/interests/lib/interest";

const PER_PAGE = 12;
const STATUS_KEYS = ["pending", "accepted", "rejected", "cancelled"];

const statusBadge = {
  pending: "bg-tint-warning text-warning-ink",
  accepted: "bg-tint-success text-success-ink",
  rejected: "bg-tint-danger text-danger-ink",
  cancelled: "bg-accent-100 text-primary-600",
};

/**
 * Sent interest board — US-046 (T060).
 * Investor only. Cards show the project (title / AI score / status), the
 * investor's message, a cancel action while pending/accepted, and — once
 * accepted — the idea-owner email + agreement link.
 */
export default function InterestsSentPage() {
  const t = useTranslations("interests");
  const format = useFormatter();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [interests, setInterests] = useState([]);
  const [counters, setCounters] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    cancelled: 0,
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState([]);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSent({
        status: filters.length ? filters.join(",") : undefined,
        page,
        perPage: PER_PAGE,
      });
      setInterests((res?.data ?? []).map(mapApiInterest));
      setCounters(
        res?.counters ?? { total: 0, pending: 0, accepted: 0, rejected: 0, cancelled: 0 }
      );
      setTotalPages(res?.meta?.last_page ?? 1);
    } catch (err) {
      toast.error(err.body?.message ?? t("board.loadError"));
    } finally {
      setLoading(false);
    }
  }, [filters, page, toast, t]);

  useEffect(() => {
    load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  // Close the cancel dialog on Escape.
  useEffect(() => {
    if (!cancelTarget) return;
    const onKey = (e) => {
      if (e.key === "Escape") setCancelTarget(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancelTarget]);

  function toggleFilter(status) {
    setFilters((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
    setPage(1);
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await cancelInterest(cancelTarget.id);
      setInterests((prev) =>
        prev.map((i) => (i.id === cancelTarget.id ? { ...i, status: "cancelled" } : i))
      );
      toast.success(t("errors.cancelSuccess"));
      setCancelTarget(null);
      load(); // refresh counters
    } catch (err) {
      toast.error(err.body?.message ?? t("errors.cancelFailed"));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t("board.sentTitle")}</h1>
        <p className="mt-1 text-text-secondary">{t("board.sentSubtitle")}</p>
      </div>

      {/* Counter widgets */}
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-5"
        role="list"
        aria-label={t("board.counters.total")}
      >
        {["total", ...STATUS_KEYS].map((key) => (
          <div
            key={key}
            role="listitem"
            className="rounded-xl border border-border bg-surface-1 p-4 text-center shadow-sm"
          >
            <p className="font-heading text-2xl font-bold tabular-nums text-text-primary">
              {counters[key] ?? 0}
            </p>
            <p className="mt-0.5 text-xs text-text-secondary">{t(`board.counters.${key}`)}</p>
          </div>
        ))}
      </div>

      {/* Combinable status filter bar */}
      <div role="group" aria-label={t("board.filterStatus")} className="flex flex-wrap gap-2">
        <FilterPill
          active={filters.length === 0}
          onClick={() => {
            setFilters([]);
            setPage(1);
          }}
        >
          {t("board.all")}
        </FilterPill>
        {STATUS_KEYS.map((status) => (
          <FilterPill key={status} active={filters.includes(status)} onClick={() => toggleFilter(status)}>
            {t(`board.counters.${status}`)}
          </FilterPill>
        ))}
      </div>

      <InterestBoard
        loading={loading}
        items={interests}
        emptyIcon={PaperPlaneTilt}
        emptyTitle={t("empty.sentTitle")}
        emptyDescription={t("empty.sentDesc")}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      >
        {interests.map((row) => (
          <SentCard key={row.id} row={row} onCancel={() => setCancelTarget(row)} />
        ))}
      </InterestBoard>

      {/* Cancel confirmation dialog */}
      <AnimatePresence>
        {cancelTarget && (
          <motion.div
            className="fixed inset-0 z-100 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="presentation"
          >
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setCancelTarget(null)}
              aria-hidden
            />
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="cancel-dialog-title"
              aria-describedby="cancel-dialog-desc"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-md rounded-2xl border border-border bg-surface-0 p-6 shadow-xl"
            >
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-tint-danger">
                <Warning size={28} weight="bold" className="text-danger" aria-hidden />
              </span>
              <h2
                id="cancel-dialog-title"
                className="mt-4 text-center font-heading text-lg font-bold text-text-primary"
              >
                {t("confirmCancel.title")}
              </h2>
              <p
                id="cancel-dialog-desc"
                className="mt-2 text-center text-sm leading-relaxed text-text-secondary"
              >
                {t("confirmCancel.body")}
              </p>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
                <Button variant="secondary" onClick={() => setCancelTarget(null)} disabled={cancelling}>
                  {t("confirmCancel.cancel")}
                </Button>
                <Button variant="danger" loading={cancelling} onClick={confirmCancel}>
                  {t("confirmCancel.confirm")}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterPill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "border-primary-600 bg-primary-600 text-white"
          : "border-border bg-surface-1 text-text-secondary hover:border-primary-500 hover:text-text-primary"
      )}
    >
      {children}
    </button>
  );
}

function SentCard({ row, onCancel }) {
  const t = useTranslations("interests");
  const format = useFormatter();

  const projectTitle = row.project?.title ?? "—";
  const ownerEmail = row.emails?.idea_owner_email;
  const canCancel = row.can_cancel || row.status === "pending" || row.status === "accepted";

  return (
    <article className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {row.project && (
            <div className="flex flex-wrap items-center gap-2">
              <AIScoreBadge score={row.project.ai_score ?? 0} showLabel={false} />
              <h2 className="min-w-0 font-heading text-lg font-semibold">
                <Link
                  href={`/projects/${row.project.id}`}
                  className="text-primary-600 hover:underline"
                >
                  {projectTitle}
                </Link>
              </h2>
            </div>
          )}

          <div className="mt-3 space-y-1.5 text-sm">
            {row.message && (
              <p className="rounded-lg bg-surface-0 px-3 py-2 text-text-primary">{row.message}</p>
            )}
            {row.rejection_reason && (
              <p className="flex items-start gap-1.5 text-danger-ink">
                <Warning size={16} className="mt-0.5 shrink-0" aria-hidden />
                <span>
                  <span className="font-medium">{t("sent.rejectionReason")}: </span>
                  {row.rejection_reason}
                </span>
              </p>
            )}
            {row.status === "accepted" && ownerEmail && (
              <p className="flex items-center gap-1.5 text-text-secondary">
                <EnvelopeSimple size={16} aria-hidden />
                {t("sent.ownerEmail")}:{" "}
                <span dir="ltr" className="font-medium">
                  {ownerEmail}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              statusBadge[row.status] ?? "bg-accent-100 text-primary-600"
            )}
          >
            {t(`status.${row.status}`)}
          </span>
          <p className="text-xs text-text-secondary">
            {row.created_at
              ? format.dateTime(new Date(row.created_at), { dateStyle: "medium" })
              : "—"}
          </p>
          {row.status === "accepted" && row.agreement_id && (
            <Link href={`/agreements/${row.agreement_id}`}>
              <Button size="sm" variant="outline">
                <LinkSimple size={16} aria-hidden />
                {t("sent.viewAgreement")}
              </Button>
            </Link>
          )}
          {canCancel && (
            <Button size="sm" variant="outline" onClick={onCancel}>
              {t("sent.cancel")}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
