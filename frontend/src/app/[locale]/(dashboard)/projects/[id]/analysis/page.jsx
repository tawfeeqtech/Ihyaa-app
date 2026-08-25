"use client";

import { useParams } from "next/navigation";
import { AgentReportView } from "@/features/projects/components/AgentReportView";

/**
 * صفحة تحليل المشروع — EPIC-15 (US-080..084 · SRS-API-42/43).
 *
 * تحت (dashboard): المالك فقط (الخادم يفرض 403 لغير المالك). تعرض مقارنة /
 * SWOT / تقريراً تنافسياً من آخر تقييم رسمي، مع زر "تحديث التحليل" (T120)
 * وتصدير PDF (T118). النصوص/القوالب فقط — لا MCP خارجي (الدستور VI).
 */
export default function ProjectAnalysisPage() {
  const params = useParams();
  const id = params?.id;

  if (!id) return null;

  return <AgentReportView projectId={String(id)} />;
}
