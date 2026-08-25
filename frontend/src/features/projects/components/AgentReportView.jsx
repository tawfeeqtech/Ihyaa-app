"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowCounterClockwise,
  ArrowLeft,
  DownloadSimple,
  FilePdf,
  Lightbulb,
  LineSegments,
  MagnifyingGlass,
  Timer,
  Warning,
} from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/config/i18n/link";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { SkeletonText } from "@/shared/components/Skeleton";
import { useToast } from "@/shared/components/Toast";
import { cn } from "@/shared/utils";
import { CompetitiveTemplate, ComparisonTemplate, SwotTemplate } from "./AgentTemplates";
import {
  ANALYSIS_TYPES,
  fetchAgentPdf,
  fetchProjectArtifacts,
  mapAgentArtifact,
  startAnalysis,
} from "../lib/aiAgent";

/** Icons per analysis type for the tab bar. */
const TYPE_ICONS = {
  comparison: MagnifyingGlass,
  swot: Lightbulb,
  competitive: LineSegments,
};

/** The statuses that keep the polling loop alive. */
const ACTIVE_STATUSES = new Set(["processing"]);

/** Poll interval while an analysis is processing (ms). */
const POLL_INTERVAL = 4000;

/** Pick the first type that has a non-processing artifact, else "comparison". */
function firstAvailable(map) {
  for (const type of ANALYSIS_TYPES) {
    if (map[type] && map[type].status !== "processing") return type;
  }
  return "comparison";
}

/** Status dot for the tab bar: completed ✓ green · processing amber pulse · failed red · none gray. */
function StatusDot({ status }) {
  const dotClass =
    status === "completed"
      ? "bg-success"
      : status === "processing"
        ? "bg-warning"
        : status === "failed"
          ? "bg-danger"
          : "bg-text-secondary/40";
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        dotClass,
        status === "processing" && "animate-pulse"
      )}
      aria-hidden
    />
  );
}

/**
 * EPIC-15 — AI Agent report view (US-080..084 · SRS-API-42/43).
 *
 * Idea-owner only (the backend enforces ownership — 403 for others). Loads the
 * latest artifact per analysis type (comparison/swot/competitive), lets the
 * owner start or update an analysis (T120 — "تحديث التحليل" creates a new
 * version, never automatic), shows processing/failed/completed states, and
 * exports the completed report as PDF (mPDF — T118).
 *
 * الدستور VI: text/template only — no external MCP in MVP.
 *
 * @param {string} projectId  The project to analyze (owner required).
 */
export function AgentReportView({ projectId }) {
  const t = useTranslations("aiAgent");
  const toast = useToast();
  const locale = useLocale();

  // type -> normalized artifact | undefined
  const [artifacts, setArtifacts] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState("comparison");
  // types currently being POSTed (start/update in flight)
  const [running, setRunning] = useState(() => new Set());

  /** Fetch the latest artifact for one type and update state. */
  const loadType = useCallback(
    async (type) => {
      const res = await fetchProjectArtifacts(projectId, type);
      const list = Array.isArray(res) ? res : [];
      const latest = list.length ? mapAgentArtifact(list[list.length - 1]) : null;
      setArtifacts((prev) => ({ ...prev, [type]: latest }));
      return latest;
    },
    [projectId]
  );

  /** Fetch the latest artifact for every type. */
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchProjectArtifacts(projectId);
      const list = Array.isArray(res) ? res : [];
      const map = {};
      for (const item of list) {
        const artifact = mapAgentArtifact(item);
        if (artifact.analysis_type) map[artifact.analysis_type] = artifact;
      }
      setArtifacts(map);
      setActiveType((prev) => (map[prev] ? prev : firstAvailable(map)));
    } catch (err) {
      toast.error(err.body?.message ?? t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [projectId, toast, t]);

  useEffect(() => {
    loadAll(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [loadAll]);

  // Poll every POLL_INTERVAL while any artifact is still processing. The effect
  // re-runs whenever `artifacts` changes (each poll updates state) and stops
  // once no type is active.
  useEffect(() => {
    const processing = ANALYSIS_TYPES.filter((type) => artifacts[type]?.status === "processing");
    if (processing.length === 0) return undefined;

    let cancelled = false;
    let timer = null;

    const poll = async () => {
      await Promise.all(processing.map((type) => loadType(type).catch(() => null)));
      if (cancelled) return;
      // If a polled artifact is still processing, the effect re-runs on the
      // state update and schedules the next tick automatically.
    };

    timer = window.setTimeout(() => {
      poll();
    }, POLL_INTERVAL);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [artifacts, loadType]);

  /** Start a new analysis of `type` (also used by "تحديث التحليل" — T120). */
  const handleStart = useCallback(
    async (type) => {
      setRunning((prev) => new Set(prev).add(type));
      try {
        const res = await startAnalysis(projectId, type, locale);
        // Optimistically mark the type as processing with the returned id/version.
        setArtifacts((prev) => ({
          ...prev,
          [type]: {
            id: res?.artifact_id,
            project_id: projectId,
            analysis_type: type,
            artifact_data: {},
            version: res?.version ?? 1,
            status: "processing",
            model_used: null,
            language: locale,
            error_message: null,
            created_at: new Date().toISOString(),
          },
        }));
        setActiveType(type);
        toast.success(t("started"));
      } catch (err) {
        const code = err.body?.code;
        if (code === "ANALYSIS_IN_PROGRESS") {
          toast.info(t("alreadyRunning"));
          loadType(type).catch(() => null);
        } else if (code === "PROJECT_NOT_EVALUATED" || err.status === 403) {
          toast.error(err.body?.message ?? (err.status === 403 ? t("notOwner") : t("loadError")));
        } else {
          toast.error(err.body?.message ?? t("loadError"));
        }
      } finally {
        setRunning((prev) => {
          const next = new Set(prev);
          next.delete(type);
          return next;
        });
      }
    },
    [projectId, locale, t, toast, loadType]
  );

  /** Export a completed artifact as PDF (T118). */
  const handleExport = useCallback(
    async (artifact) => {
      try {
        const url = await fetchAgentPdf(artifact.id);
        const a = document.createElement("a");
        a.href = url;
        a.download = `analysis-${artifact.analysis_type}-v${artifact.version}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        toast.error(err.body?.code === "ANALYSIS_INCOMPLETE" ? t("processingTitle") : t("exportError"));
      }
    },
    [t, toast]
  );

  const active = artifacts[activeType];

  /* ---------- Loading skeleton ---------- */
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-text-secondary">{t("subtitle")}</p>
        </div>
        <div className="space-y-3">
          <SkeletonText lines={2} />
          <div className="rounded-xl border border-border bg-surface-1 p-6 shadow-sm">
            <SkeletonText lines={5} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---------- Header ---------- */}
      <div>
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 transition-colors hover:underline"
        >
          <ArrowLeft size={16} aria-hidden className="rtl:rotate-180" />
          {t("backToProject")}
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-bold sm:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-text-secondary">{t("subtitle")}</p>
      </div>

      {/* ---------- Type tabs ---------- */}
      <div role="tablist" aria-label={t("tabsLabel")} className="flex flex-wrap gap-2">
        {ANALYSIS_TYPES.map((type) => {
          const Icon = TYPE_ICONS[type];
          const status = artifacts[type]?.status ?? "none";
          const isActive = activeType === type;
          return (
            <button
              key={type}
              type="button"
              role="tab"
              id={`ai-tab-${type}`}
              aria-selected={isActive}
              aria-controls={`ai-panel-${type}`}
              onClick={() => setActiveType(type)}
              className={cn(
                "inline-flex min-h-12 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary-600 bg-primary-600 text-white shadow-sm"
                  : "border-border bg-surface-1 text-text-secondary hover:border-primary-500 hover:text-text-primary"
              )}
            >
              <Icon size={18} aria-hidden />
              {t(`tabs.${type}`)}
              <StatusDot status={status} />
            </button>
          );
        })}
      </div>

      {/* ---------- Active type panel ---------- */}
      <div
        key={activeType}
        role="tabpanel"
        id={`ai-panel-${activeType}`}
        aria-labelledby={`ai-tab-${activeType}`}
        className="rounded-2xl border border-border bg-surface-0 p-5 shadow-sm sm:p-6"
      >
        {!active ? (
          <StartFirstCard
            type={activeType}
            busy={running.has(activeType)}
            onStart={() => handleStart(activeType)}
          />
        ) : active.status === "processing" ? (
          <ProcessingCard type={activeType} />
        ) : active.status === "failed" ? (
          <FailedCard
            artifact={active}
            busy={running.has(activeType)}
            onRetry={() => handleStart(activeType)}
          />
        ) : (
          <CompletedReport
            artifact={active}
            busy={running.has(activeType)}
            onUpdate={() => handleStart(activeType)}
            onExport={() => handleExport(active)}
          />
        )}
      </div>
    </div>
  );
}

/* ——————————————————————— State cards ——————————————————————— */

/** CTA for a type that has never been run — "ابدأ تحليلك الأول" (T117). */
function StartFirstCard({ type, busy, onStart }) {
  const t = useTranslations("aiAgent");
  const ctaKey = { comparison: "startComparison", swot: "startSwot", competitive: "startCompetitive" }[type];

  return (
    <EmptyState
      icon={Lightbulb}
      title={t("startFirstTitle")}
      description={t("startFirstDesc")}
      action={
        <Button onClick={onStart} loading={busy}>
          {t(ctaKey)}
        </Button>
      }
    />
  );
}

/** Processing state — "قيد المعالجة" with the async note. */
function ProcessingCard({ type }) {
  const t = useTranslations("aiAgent");
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center" role="status" aria-live="polite">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-100">
        <Timer size={30} className="animate-pulse text-primary-600" aria-hidden />
      </span>
      <h3 className="font-heading text-lg font-semibold text-text-primary">{t("processingTitle")}</h3>
      <p className="max-w-sm text-sm text-text-secondary">{t("processingDesc")}</p>
      <span className="mt-1 inline-flex min-h-8 items-center rounded-full bg-tint-warning px-3 text-xs font-semibold text-warning-ink">
        <StatusDot status="processing" />
        <span className="ms-1.5">{t("status.processing")}</span>
      </span>
    </div>
  );
}

/** Failed state — error message + retry (T122). */
function FailedCard({ artifact, busy, onRetry }) {
  const t = useTranslations("aiAgent");
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-tint-danger">
        <Warning size={30} weight="bold" className="text-danger-ink" aria-hidden />
      </span>
      <h3 className="font-heading text-lg font-semibold text-text-primary">{t("failedTitle")}</h3>
      {artifact.error_message ? (
        <p className="max-w-md text-sm text-text-secondary">{artifact.error_message}</p>
      ) : null}
      <Button variant="secondary" onClick={onRetry} loading={busy} className="mt-2">
        <ArrowCounterClockwise size={18} aria-hidden />
        {t("retry")}
      </Button>
    </div>
  );
}

/** Completed report — template + version/meta + update/export actions (T117/T120/T118). */
function CompletedReport({ artifact, busy, onUpdate, onExport }) {
  const t = useTranslations("aiAgent");
  const { artifact_data = {} } = artifact;

  let template;
  if (artifact.analysis_type === "swot") template = <SwotTemplate data={artifact_data} />;
  else if (artifact.analysis_type === "competitive") template = <CompetitiveTemplate data={artifact_data} />;
  else template = <ComparisonTemplate data={artifact_data} />;

  return (
    <div className="space-y-5">
      {template}

      {/* Meta + actions */}
      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
          <span className="inline-flex min-h-7 items-center rounded-full bg-accent-100 px-2.5 font-semibold text-primary-600">
            {t("version", { version: artifact.version })}
          </span>
          {artifact.model_used ? (
            <span>{t("model", { model: artifact.model_used })}</span>
          ) : null}
          <span>{t("status.completed")}</span>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="secondary" onClick={onExport}>
            <FilePdf size={18} aria-hidden />
            <DownloadSimple size={18} weight="bold" aria-hidden />
            {t("exportPdf")}
          </Button>
          {/* T120 — "تحديث التحليل": manual, never automatic; creates a new version. */}
          <Button onClick={onUpdate} loading={busy}>
            <ArrowCounterClockwise size={18} aria-hidden />
            {t("update")}
          </Button>
        </div>
      </div>
    </div>
  );
}
