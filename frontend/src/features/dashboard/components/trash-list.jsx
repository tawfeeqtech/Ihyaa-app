"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowCounterClockwise,
  CalendarX,
  Hourglass,
  Trash,
  TrashSimple,
  Warning,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Link } from "@/config/i18n/link";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { useToast } from "@/shared/components/Toast";
import { api } from "@/shared/lib/api";
import { cn } from "@/shared/utils";

/**
 * EPIC-10 · Trash list (US-055 · T075/T076) — trash-api.md §1..3.
 *
 * Client widget fed by the `/trash` server shell (`initialItems`). Two actions
 * per row, both guarded by the backend:
 *  - Restore → POST /api/trashed-projects/{id}/restore → toast + row leaves.
 *  - Force delete → DELETE /api/trashed-projects/{id}/force with a
 *    `{ confirm: true }` body (the backend 422s without it). A confirmation
 *    dialog warns «لا يمكن التراجع عن هذا الإجراء» first (مبدأ I — إفصاح).
 *
 * Rows past their 30-day window (`restorable: false`) hide the restore action;
 * `days_remaining <= 0` surfaces «الحذف النهائي وشيك» (trash-api.md §1).
 */

function daysLabel(t, days) {
  if (days == null) return "";
  if (days <= 0) return t("purgeSoon");
  if (days === 1) return t("daysLeftOne");
  if (days === 2) return t("daysLeftTwo");
  if (days >= 3 && days <= 10) return t("daysLeftFew", { count: days });
  return t("daysLeftMany", { count: days });
}

export function TrashList({ initialItems = [], className }) {
  const t = useTranslations("trash");
  const toast = useToast();

  const [items, setItems] = useState(initialItems);
  const [busyId, setBusyId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Close the confirmation dialog on Escape (SRS-UI-A11 · modal behaviour).
  useEffect(() => {
    if (!confirmTarget) return;
    const onKey = (e) => {
      if (e.key === "Escape") setConfirmTarget(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmTarget]);

  async function restore(item) {
    setBusyId(item.id);
    try {
      await api.post(`/trashed-projects/${item.id}/restore`, {});
      setItems((prev) => prev.filter((p) => p.id !== item.id));
      toast.success(t("restored"), item.title);
    } catch (err) {
      toast.error(err.body?.message ?? t("restoreFailed"), item.title);
    } finally {
      setBusyId(null);
    }
  }

  async function confirmForceDelete() {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/trashed-projects/${confirmTarget.id}/force`, {
        body: JSON.stringify({ confirm: true }),
      });
      setItems((prev) => prev.filter((p) => p.id !== confirmTarget.id));
      toast.success(t("forceDeleted"), confirmTarget.title);
      setConfirmTarget(null);
    } catch (err) {
      toast.error(err.body?.message ?? t("forceDeleteFailed"), confirmTarget.title);
    } finally {
      setDeleting(false);
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Trash}
        title={t("empty")}
        description={t("emptyDesc")}
        className={className}
        action={
          <Link href="/dashboard/owner">
            <Button variant="secondary">{t("backToDashboard")}</Button>
          </Link>
        }
      />
    );
  }

  return (
    <>
      <ul className={cn("space-y-4", className)}>
        {items.map((item) => (
          <TrashRow
            key={item.id}
            item={item}
            t={t}
            busy={busyId === item.id}
            onRestore={() => restore(item)}
            onForceDelete={() => setConfirmTarget(item)}
          />
        ))}
      </ul>

      {/* Force-delete confirmation dialog (T076 · trash-api.md §3) */}
      <AnimatePresence>
        {confirmTarget && (
          <motion.div
            className="fixed inset-0 z-100 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="presentation"
          >
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setConfirmTarget(null)}
              aria-hidden
            />
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="trash-confirm-title"
              aria-describedby="trash-confirm-desc"
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
                id="trash-confirm-title"
                className="mt-4 text-center font-heading text-lg font-bold text-text-primary"
              >
                {t("confirmForceTitle")}
              </h2>
              <p
                id="trash-confirm-desc"
                className="mt-2 text-center text-sm leading-relaxed text-text-secondary"
              >
                {t("confirmForceBody")}
              </p>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
                <Button
                  variant="secondary"
                  onClick={() => setConfirmTarget(null)}
                  disabled={deleting}
                >
                  {t("confirmForceCancel")}
                </Button>
                <Button variant="danger" loading={deleting} onClick={confirmForceDelete}>
                  <TrashSimple size={18} weight="bold" aria-hidden />
                  {t("confirmForceConfirm")}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function TrashRow({ item, t, busy, onRestore, onForceDelete }) {
  const cover = item.cover_url ?? null;
  const category = item.category?.name ?? null;
  const restorable = item.restorable === true;

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-border bg-surface-1 p-4 shadow-sm sm:flex-row sm:items-center">
      {/* Cover thumbnail */}
      <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-primary-600 via-primary-500 to-primary-600 sm:w-36">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-white/25">
            {item.title?.slice(0, 1) ?? "؟"}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-1 font-heading text-base font-semibold text-text-primary">
          {item.title}
        </h3>
        {category && <p className="mt-0.5 text-xs text-text-secondary">{category}</p>}

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
          <span
            className={cn(
              "inline-flex items-center gap-1",
              !restorable && "font-medium text-danger-ink"
            )}
          >
            {item.days_remaining <= 0 ? (
              <Hourglass size={14} className="shrink-0" aria-hidden />
            ) : (
              <CalendarX size={14} className="shrink-0" aria-hidden />
            )}
            {restorable
              ? daysLabel(t, item.days_remaining)
              : t("notRestorable")}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 flex-col gap-2 sm:w-44">
        {restorable && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRestore}
            disabled={busy}
            data-testid="trash-restore"
          >
            <ArrowCounterClockwise size={16} weight="bold" aria-hidden />
            {t("restore")}
          </Button>
        )}
        <Button
          size="sm"
          variant="danger"
          onClick={onForceDelete}
          disabled={busy}
          data-testid="trash-force-delete"
        >
          <TrashSimple size={16} weight="bold" aria-hidden />
          {t("deleteForever")}
        </Button>
      </div>
    </article>
  );
}
