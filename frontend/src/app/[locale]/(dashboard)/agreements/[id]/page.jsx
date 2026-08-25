"use client";

import { useCallback, useEffect, useState } from "react";
import { FilePdf, House } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Link } from "@/config/i18n/link";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { Skeleton } from "@/shared/components/Skeleton";
import { AgreementViewer } from "@/features/interests/components/AgreementViewer";
import { fetchAgreementMeta } from "@/features/interests/lib/interest";

/**
 * Agreement page — US-045 (T056).
 *
 * Client component so the meta + PDF fetches can be mocked in E2E. Displays the
 * agreement metadata (parties + counterpart emails) and a preview/download of
 * the PDF agreement.
 */
export default function AgreementPage({ params }) {
  const { id } = params;
  const t = useTranslations("interests");
  const [loading, setLoading] = useState(true);
  const [agreement, setAgreement] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAgreementMeta(id);
      setAgreement(data);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4" aria-busy>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (notFound || !agreement) {
    return (
      <EmptyState
        icon={FilePdf}
        title={t("agreement.notFoundTitle")}
        description={t("agreement.notFoundDesc")}
        action={
          <Link href="/dashboard">
            <Button>
              <House size={18} weight="bold" aria-hidden />
              {t("agreement.backToDashboard")}
            </Button>
          </Link>
        }
      />
    );
  }

  return <AgreementViewer agreement={agreement} />;
}
