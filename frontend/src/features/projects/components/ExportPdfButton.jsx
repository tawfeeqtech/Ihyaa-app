"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DownloadSimple, FilePdf } from "@phosphor-icons/react";
import { Button } from "@/shared/components/Button";
import { AUTH_COOKIE } from "@/shared/lib/api";
import { useToast } from "@/shared/components/Toast";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

/** Read a cookie by name in the browser. */
function getCookie(name) {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/** Resolve the backend's `export.pdf_url` (e.g. /api/.../report?lang=ar). */
function resolvePdfUrl(pdfUrl, locale) {
  const raw = pdfUrl ?? "";
  // The backend builds the URL with an `/api` prefix; BASE_URL already ends
  // with `/api`, so strip the leading prefix to avoid doubling it.
  const path = raw.replace(/^\/api/, "");
  if (!path) return null;

  // Add the locale only when the backend didn't already pin `lang=`.
  const sep = path.includes("?") ? "&" : "?";
  const hasLang = /[?&]lang=/.test(path);
  return `${BASE_URL}${path}${hasLang ? "" : `${sep}lang=${locale}`}`;
}

/**
 * ExportPdfButton — زر تصدير تقرير PDF (T108 · US-028).
 *
 * يُعرض فقط عندما `export.allowed === true` (مصفوفة الإفصاح — L3/EX/AD)؛
 * الحماية الفعلية على الخادم (403 PDF_EXPORT_DENIED) — إخفاء الواجهة وحده
 * غير كافٍ (المبدأ الدستوري I). يجلب الـ PDF كـ blob مع Bearer token ثم
 * يطلق التنزيل.
 *
 * @param {Object}  exportMeta  { pdf_url: string, allowed: boolean } — من بيانات التقرير
 * @param {string}  [filename]  اسم الملف المقترح عند غياب Content-Disposition
 * @param {string}  [locale]    لغة التقرير (ar|en) — تُضاف إلى الرابط
 */
export function ExportPdfButton({ exportMeta = {}, filename, locale = "ar" }) {
  const t = useTranslations("projects");
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  if (!exportMeta?.allowed) return null;

  async function handleExport() {
    const token = getCookie(AUTH_COOKIE);
    if (!token) {
      toast.info(t("report.exportLogin"));
      return;
    }

    const url = resolvePdfUrl(exportMeta.pdf_url, locale);
    if (!url) {
      toast.error(t("report.exportError"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/pdf",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const code = body?.code;
        toast.error(
          code === "PDF_EXPORT_DENIED" ? t("report.exportDenied") : t("report.exportError")
        );
        return;
      }

      const blob = await res.blob();

      // File name from Content-Disposition when present, else the caller's hint.
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const name = match?.[1] ?? filename ?? `evaluation-report-${locale}.pdf`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("report.exportError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="secondary" onClick={handleExport} loading={loading}>
      {loading ? (
        t("report.exporting")
      ) : (
        <>
          <FilePdf size={18} className="text-danger" aria-hidden />
          <DownloadSimple size={18} weight="bold" aria-hidden />
          {t("report.exportPdf")}
        </>
      )}
    </Button>
  );
}
