"use client";

import { useEffect, useState } from "react";
import { DownloadSimple, FilePdf } from "@phosphor-icons/react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/shared/components/Button";
import { Skeleton } from "@/shared/components/Skeleton";
import { fetchAgreementPdf } from "@/features/interests/lib/interest";

/**
 * AgreementViewer — US-045 (T056).
 *
 * Renders the agreement metadata card + a live PDF preview + download button.
 * The PDF is fetched as a blob (the API requires a Bearer header, so a plain
 * <a href> cannot be used) and surfaced through an object URL. The preview is
 * a keyed child (`retryKey`) so the retry remounts it with fresh state.
 */
export function AgreementViewer({ agreement }) {
  const t = useTranslations("interests");
  const format = useFormatter();
  const [retryKey, setRetryKey] = useState(0);

  const projectTitle = agreement.project?.title ?? "—";
  const createdAt = agreement.created_at
    ? format.dateTime(new Date(agreement.created_at), { dateStyle: "long" })
    : "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t("agreement.title")}</h1>
        <p className="mt-1 text-text-secondary">{t("agreement.subtitle")}</p>
      </div>

      {/* Meta card — parties + counterpart emails */}
      <dl className="grid gap-4 rounded-xl border border-border bg-surface-1 p-5 shadow-sm sm:grid-cols-2">
        <MetaItem label={t("agreement.project")} value={projectTitle} />
        <MetaItem label={t("agreement.createdAt")} value={createdAt} />
        <MetaItem
          label={t("agreement.ideaOwner")}
          value={agreement.idea_owner_name ?? "—"}
          sub={agreement.idea_owner_email}
        />
        <MetaItem
          label={t("agreement.investor")}
          value={agreement.investor_name ?? "—"}
          sub={agreement.investor_email}
        />
      </dl>

      {/* PDF preview + download (remount on retry) */}
      <PdfPreview
        key={retryKey}
        agreementId={agreement.id}
        onRetry={() => setRetryKey((k) => k + 1)}
      />
    </div>
  );
}

/**
 * Loads the agreement PDF blob once on mount and shows a preview + download
 * button. The initial state is already `null`/`false`, so the effect only
 * sets state in async callbacks — retries remount this component via `key`.
 */
function PdfPreview({ agreementId, onRetry }) {
  const t = useTranslations("interests");
  const [pdfUrl, setPdfUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;
    fetchAgreementPdf(agreementId)
      .then((url) => {
        if (cancelled) return;
        objectUrl = url;
        setPdfUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [agreementId]);

  function download() {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `agreement-${agreementId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-1 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <FilePdf size={18} className="text-danger" aria-hidden />
          {t("agreement.preview")}
        </p>
        <Button size="sm" onClick={download} disabled={!pdfUrl}>
          <DownloadSimple size={16} weight="bold" aria-hidden />
          {t("agreement.download")}
        </Button>
      </div>
      {error ? (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <p className="text-sm text-danger-ink">{t("agreement.previewError")}</p>
          <Button size="sm" variant="outline" onClick={onRetry}>
            {t("agreement.retry")}
          </Button>
        </div>
      ) : pdfUrl ? (
        <iframe src={pdfUrl} title={t("agreement.preview")} className="h-[70vh] w-full" />
      ) : (
        <div className="flex h-64 items-center justify-center" aria-busy>
          <Skeleton className="h-6 w-40" />
        </div>
      )}
    </div>
  );
}

function MetaItem({ label, value, sub }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</dt>
      <dd className="mt-1 font-heading font-semibold text-text-primary">{value}</dd>
      {sub && (
        <dd className="mt-0.5 text-sm text-text-secondary" dir="ltr">
          {sub}
        </dd>
      )}
    </div>
  );
}
