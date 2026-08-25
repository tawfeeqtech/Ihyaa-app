"use client";

import { useCallback, useEffect, useState } from "react";
import { EnvelopeSimple, LinkSimple, Tray, Warning } from "@phosphor-icons/react";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/config/i18n/link";
import { Button } from "@/shared/components/Button";
import { useToast } from "@/shared/components/Toast";
import { cn } from "@/shared/utils";
import { AIScoreBadge } from "@/features/projects/components/AIScoreBadge";
import { InterestBoard } from "@/features/interests/components/InterestBoard";
import { InterestButtons } from "@/features/interests/components/InterestButtons";
import { fetchReceived, mapApiInterest } from "@/features/interests/lib/interest";

const PER_PAGE = 12;
const STATUS_KEYS = ["pending", "accepted", "rejected", "cancelled"];

const statusBadge = {
  pending: "bg-tint-warning text-warning-ink",
  accepted: "bg-tint-success text-success-ink",
  rejected: "bg-tint-danger text-danger-ink",
  cancelled: "bg-accent-100 text-primary-600",
};

/**
 * Received interest board — US-046 (T059 + T061).
 * Idea-owner only. Cards show the investor, interest type, message, status,
 * accept/reject actions, rejection reason and — once accepted — the investor
 * email (الدستور §I: no early disclosure).
 */
export default function InterestsReceivedPage() {
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
  const [filters, setFilters] = useState([]); // combinable statuses

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchReceived({
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

  function toggleFilter(status) {
    setFilters((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
    setPage(1);
  }

  function handleStatusChange(id, updated) {
    setInterests((prev) => prev.map((i) => (i.id === id ? mapApiInterest(updated) : i)));
    load(); // refresh counters + agreement links
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">
          {t("board.receivedTitle")}
        </h1>
        <p className="mt-1 text-text-secondary">{t("board.receivedSubtitle")}</p>
      </div>

      {/* Counter widgets (US-046 S3) */}
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

      {/* Combinable status filter bar (US-046 S2) */}
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
        emptyIcon={Tray}
        emptyTitle={t("empty.receivedTitle")}
        emptyDescription={t("empty.receivedDesc")}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      >
        {interests.map((row) => (
          <ReceivedCard key={row.id} row={row} onStatusChange={handleStatusChange} />
        ))}
      </InterestBoard>
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

function ReceivedCard({ row, onStatusChange }) {
  const t = useTranslations("interests");
  const format = useFormatter();

  const investorName = row.investor?.name ?? "—";
  const projectTitle = row.project?.title ?? "—";
  const investorEmail = row.emails?.investor_email;

  return (
    <article className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-600 font-heading text-sm font-bold text-white">
              {investorName.trim().charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-heading font-semibold text-text-primary">
                {investorName}
              </p>
              <p className="truncate text-xs text-text-secondary">
                {t("received.type")}: {t(`types.${row.interest_type}`)}
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-1.5 text-sm">
            {row.project && (
              <p className="flex flex-wrap items-center gap-1.5 text-text-secondary">
                <AIScoreBadge score={row.project.ai_score ?? 0} showLabel={false} />
                <Link
                  href={`/projects/${row.project.id}`}
                  className="font-medium text-primary-600 hover:underline"
                >
                  {projectTitle}
                </Link>
              </p>
            )}
            {row.message && (
              <p className="rounded-lg bg-surface-0 px-3 py-2 text-text-primary">{row.message}</p>
            )}
            {row.rejection_reason && (
              <p className="flex items-start gap-1.5 text-danger-ink">
                <Warning size={16} className="mt-0.5 shrink-0" aria-hidden />
                <span>
                  <span className="font-medium">{t("received.rejectionReason")}: </span>
                  {row.rejection_reason}
                </span>
              </p>
            )}
            {row.status === "accepted" && investorEmail && (
              <p className="flex items-center gap-1.5 text-text-secondary">
                <EnvelopeSimple size={16} aria-hidden />
                {t("received.investorEmail")}:{" "}
                <span dir="ltr" className="font-medium">
                  {investorEmail}
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
                {t("received.viewAgreement")}
              </Button>
            </Link>
          )}
          <InterestButtons interest={row} onStatusChange={onStatusChange} />
        </div>
      </div>
    </article>
  );
}
