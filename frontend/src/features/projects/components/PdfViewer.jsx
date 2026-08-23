"use client";

import { FilePdf } from "@phosphor-icons/react";

/**
 * PdfViewer — inline iframe preview for a PDF stored under /storage/…
 * (the Laravel `public` disk, e.g. /storage/projects/abc/file.pdf).
 *
 * @param {Object} file   Single file object: { url, original_name }.
 * @param {string} title  Accessible iframe title.
 */
export function PdfViewer({ file, title = "PDF" }) {
  if (!file?.url) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-1">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <FilePdf size={18} className="shrink-0 text-danger" aria-hidden />
        <span className="min-w-0 truncate text-sm font-medium text-text-primary">
          {file.original_name ?? file.url}
        </span>
      </div>
      <iframe
        src={file.url}
        title={title}
        className="h-[480px] w-full bg-surface-0"
        loading="lazy"
      />
    </div>
  );
}
