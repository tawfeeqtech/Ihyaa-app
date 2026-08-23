"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Bookmark,
  BookmarkSimple,
  CalendarBlank,
  CaretLeft,
  CaretRight,
  DownloadSimple,
  Eye,
  FilePdf,
  Heart,
  Hourglass,
  Images,
  Link as LinkIcon,
  Lock,
  Users,
  VideoCamera,
  WarningCircle,
} from "@phosphor-icons/react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/config/i18n/link";
import { Button } from "@/shared/components/Button";
import { AIScoreBadge, getScoreTier } from "./AIScoreBadge";
import { RadarChart } from "./RadarChart";
import { GapAnalysisPanel } from "./GapAnalysisPanel";
import { RecommendationsList } from "./RecommendationsList";
import { RequiredSkillsList } from "./RequiredSkillsList";
import { ExportPdfButton } from "./ExportPdfButton";
import { ImageGallery } from "./ImageGallery";
import { PdfViewer } from "./PdfViewer";
import { VideoEmbed } from "./VideoEmbed";
import { ScoreRing } from "./ScoreRing";
import { fetchReportData, missingRadarDimensions, DIMENSION_KEY_MAP } from "../lib/report";
import { SkeletonText } from "@/shared/components/Skeleton";
import { EmptyState } from "@/shared/components/EmptyState";
import { useToast } from "@/shared/components/Toast";
import { projects, sectorLabels, statusLabels } from "@/features/projects/data/projects";
import { api } from "@/shared/lib/api";
import { avatarHue, cn, initials } from "@/shared/utils";

/** Auth detection via cookie check (deferred to avoid hydration mismatch). */
function useDemoAuth() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAuthed(document.cookie.includes("ihyaa_token="));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  return authed;
}

const dimensionKeys = ["technical", "innovation", "market", "team", "documentation"];

const swotStyles = {
  strengths: { header: "text-success-ink bg-tint-success", icon: "bg-success" },
  weaknesses: { header: "text-danger-ink bg-tint-danger", icon: "bg-danger" },
  opportunities: { header: "text-primary-600 bg-accent-100", icon: "bg-primary-600" },
  threats: { header: "text-warning-ink bg-tint-warning", icon: "bg-warning" },
};

export function ProjectDetail({ project }) {
  const t = useTranslations("projects");
  const locale = useLocale();
  const format = useFormatter();
  const toast = useToast();
  const router = useRouter();
  const authed = useDemoAuth();

  // Disclosure level for the AI report, driven by the backend's `report_access`
  // (none | overall | dimensions | full) — not by the demo auth cookie.
  const reportAccess = project.report_access ?? "none";
  const canViewDimensions = reportAccess === "dimensions" || reportAccess === "full";
  const canViewFull = reportAccess === "full";

  const [tab, setTab] = useState("overview");
  const [interestSent, setInterestSent] = useState(false);
  const [saved, setSaved] = useState(false);
  const [aiLoading, setAiLoading] = useState(true);

  // Translated axis labels for the radar (same order as dimensionKeys).
  const radarLabels = dimensionKeys.map((dim) => t(`report.dimensions.${dim}`));

  // Full report JSON from GET /projects/{project}/evaluations/{evaluation}
  // (EPIC-05). Fetched once on mount when the viewer can see at least the
  // dimension scores; the radar/gaps/skills sections read from it, with the
  // legacy `project.*` shapes as a fallback while it loads or on failure.
  const shouldFetchReport = canViewDimensions && !!project.evaluationId;
  const [reportData, setReportData] = useState(null);
  const [reportReady, setReportReady] = useState(false);

  useEffect(() => {
    if (!shouldFetchReport) return;

    let cancelled = false;
    fetchReportData(project.id, project.evaluationId).then((data) => {
      if (cancelled) return;
      setReportData(data);
      setReportReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [shouldFetchReport, project.id, project.evaluationId]);

  const reportLoading = shouldFetchReport && !reportReady;

  // Radar source of truth: `radar_chart.axes` from the report endpoint when
  // available (US-025-S2 — single stored source), else the legacy dimensions.
  const radar = useMemo(() => {
    const axes = reportData?.radar_chart?.axes;
    if (Array.isArray(axes) && axes.length > 0) {
      const dimensions = {};
      const labels = [];
      axes.forEach((axis) => {
        const short = DIMENSION_KEY_MAP[axis.dimension] ?? axis.dimension;
        dimensions[short] = axis.value;
        labels.push(t(`report.dimensions.${short}`));
      });
      return {
        dimensions,
        labels,
        missingDimensions: missingRadarDimensions(reportData?.evaluation, axes).map(
          (m) => ({ ...m, label: t(`report.dimensions.${m.label}`) })
        ),
      };
    }
    return { dimensions: project.dimensions, labels: radarLabels, missingDimensions: [] };
  }, [reportData, project.dimensions, radarLabels, t]);

  // Dimension scores (FULL keys → score) for the gap-analysis linkage (T099).
  const dimensionScores = useMemo(() => {
    const dims = reportData?.evaluation?.dimensions ?? {};
    const out = {};
    Object.entries(dims).forEach(([key, entry]) => {
      if (typeof entry === "number") out[key] = entry;
      else if (entry && typeof entry.score === "number") out[key] = entry.score;
    });
    return out;
  }, [reportData]);

  // SWOT source: report endpoint returns flat string arrays; the legacy
  // project.swot uses { ar, en } objects — both are handled at render time.
  const swotSource = reportData?.swot ?? project.swot;

  const title = locale === "ar" ? project.title.ar : project.title.en;
  const description = locale === "ar" ? project.description.ar : project.description.en;
  const sectorText =
    locale === "ar"
      ? (sectorLabels[project.sector]?.ar ?? project.sector)
      : (sectorLabels[project.sector]?.en ?? project.sector);
  const statusText =
    locale === "ar"
      ? (statusLabels[project.status]?.ar ?? project.status)
      : (statusLabels[project.status]?.en ?? project.status);
  const tier = getScoreTier(project.aiScore);

  // Attachments from ProjectFile::toArrayApi(): { type: 'image'|'pdf'|'document', url, ... }.
  const imageFiles = Array.isArray(project.files)
    ? project.files.filter((f) => f.type === "image")
    : [];
  const pdfFiles = Array.isArray(project.files)
    ? project.files.filter((f) => f.type === "pdf" || f.mime_type === "application/pdf")
    : [];

  /* Simulate the async AI report fetch (backend: Laravel Queue + WebSocket). */
  useEffect(() => {
    const timer = window.setTimeout(() => setAiLoading(false), 900);
    return () => window.clearTimeout(timer);
  }, []);

  const similar = useMemo(
    () =>
      projects
        .filter((p) => p.id !== project.id && p.sector === project.sector)
        .slice(0, 3),
    [project]
  );

  const team = [
    { name: project.owner.name, role: locale === "ar" ? project.owner.role.ar : project.owner.role.en },
    { name: t("project.team.member"), role: t("project.team.memberRole") },
    { name: t("project.team.lead"), role: t("project.team.leadRole") },
  ];

  async function handleInterested() {
    if (!authed) {
      toast.info(t("detail.loginRequired"));
      router.push("/login");
      return;
    }
    try {
      await api.post(`/projects/${project.id}/interest`, {
        message: "",
        type: "investment",
      });
      setInterestSent(true);
      toast.success(t("detail.interestSent"));
    } catch (err) {
      toast.error(err.body?.message ?? t("detail.interestError"));
    }
  }

  const CaretComponent = locale === "ar" ? CaretLeft : CaretRight;

  const tabs = [
    { key: "overview", label: t("detail.tabs.overview") },
    { key: "report", label: t("detail.tabs.report") },
    { key: "team", label: t("detail.tabs.team") },
    { key: "agreement", label: t("detail.tabs.agreement") },
  ];

  return (
    <div className="space-y-6">
      {/* Cover header */}
      <div className="no-print relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-500 to-primary-600 px-6 pb-24 pt-16 sm:px-10 sm:pb-28 sm:pt-20">
        <div className="pointer-events-none absolute inset-0 pattern-islamic" aria-hidden />
        <div className="relative z-10 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
              {sectorText}
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
              {statusText}
            </span>
          </div>
          <h1 className="mt-4 font-heading text-3xl font-bold text-white sm:text-4xl">{title}</h1>
          <p className="mt-3 text-white/85">{description}</p>
        </div>
      </div>

      {/* Quick stats bar */}
      <div className="no-print -mt-16 sm:-mt-20">
        <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-surface-0 p-5 shadow-lg sm:p-6">
          <div className="grid grid-cols-2 items-center gap-4 sm:grid-cols-4">
            <div className="flex flex-col items-center gap-2">
              <ScoreRing score={project.aiScore} size={110} />
            </div>
            <StatCell icon={CalendarBlank} label={t("detail.stats.date")} value={format.dateTime(new Date(project.createdAt), { dateStyle: "medium" })} />
            <StatCell
              icon={Eye}
              label={t("detail.stats.views")}
              value={format.number(project.views)}
              valueClassName="text-primary-600"
            />
            <StatCell
              icon={Heart}
              label={t("detail.stats.budget")}
              value={format.number(project.budget, { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
              valueClassName="text-primary-600"
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row">
            <Button size="lg" onClick={handleInterested} disabled={interestSent} className="flex-1">
              {interestSent ? t("detail.interestSent") : t("detail.interested")}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => {
                if (!authed) {
                  toast.info(t("detail.loginRequired"));
                  router.push("/login");
                  return;
                }
                setSaved((s) => !s);
                toast.success(saved ? t("detail.unsaved") : t("detail.saved"));
              }}
              aria-pressed={saved}
            >
              {saved ? <BookmarkSimple size={20} weight="fill" className="text-primary-600" /> : <Bookmark size={20} />}
              {saved ? t("detail.saved") : t("detail.save")}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="min-w-0">
          {/* Tabs */}
          <div role="tablist" aria-label={t("detail.tabsLabel")} className="flex gap-1 overflow-x-auto border-b border-border">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={cn(
                  "min-h-12 shrink-0 border-b-2 px-4 text-sm font-semibold transition-colors",
                  tab === key
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="pt-6">
            {/* ============ Tab: Overview ============ */}
            {tab === "overview" && (
              <div className="space-y-6">
                <h2 className="font-heading text-xl font-bold">{t("detail.overviewTitle")}</h2>
                <p className="leading-relaxed text-text-primary">{t("detail.overviewBody")}</p>
                <p className="leading-relaxed text-text-secondary">{t("detail.overviewBody2")}</p>

                {project.videoUrl && (
                  <section aria-label={t("detail.videoDemo")}>
                    <div className="mb-3 flex items-center gap-2">
                      <VideoCamera size={18} className="text-primary-600" aria-hidden />
                      <h3 className="text-sm font-medium text-text-primary">{t("detail.videoDemo")}</h3>
                    </div>
                    <VideoEmbed
                      url={project.videoUrl}
                      provider={project.videoProvider}
                      title={t("detail.videoDemo")}
                    />
                  </section>
                )}

                {imageFiles.length > 0 && (
                  <section aria-label={t("detail.filesTitle")}>
                    <div className="mb-3 flex items-center gap-2">
                      <Images size={18} className="text-primary-600" aria-hidden />
                      <h3 className="text-sm font-medium text-text-primary">{t("detail.filesTitle")}</h3>
                    </div>
                    <ImageGallery
                      images={imageFiles}
                      prevLabel={t("detail.galleryPrev")}
                      nextLabel={t("detail.galleryNext")}
                    />
                  </section>
                )}

                {pdfFiles.length > 0 && (
                  <section aria-label={t("detail.pdfsTitle")}>
                    <div className="mb-3 flex items-center gap-2">
                      <FilePdf size={18} className="text-danger" aria-hidden />
                      <h3 className="text-sm font-medium text-text-primary">{t("detail.pdfsTitle")}</h3>
                    </div>
                    <div className="space-y-4">
                      {pdfFiles.map((file) => (
                        <PdfViewer
                          key={file.id ?? file.url}
                          file={file}
                          title={file.original_name ?? t("detail.pdfsTitle")}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {project.repoUrl && (
                  <a
                    href={project.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-border bg-surface-1 px-4 text-sm font-medium text-text-primary transition-colors hover:border-primary-500 hover:text-primary-600"
                  >
                    <LinkIcon size={18} />
                    {t("detail.repoLink")}
                  </a>
                )}
              </div>
            )}

            {/* ============ Tab: AI Report ============ */}
            {tab === "report" && (
              <div className="space-y-8">
                {aiLoading || reportLoading ? (
                  <div className="space-y-4" aria-busy>
                    <SkeletonText lines={4} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <SkeletonText lines={3} />
                      <SkeletonText lines={3} />
                    </div>
                  </div>
                ) : reportAccess === "none" ? (
                  <EmptyState
                    icon={Hourglass}
                    title={t("report.pendingTitle")}
                    description={t("report.pendingDescription")}
                  />
                ) : (
                  <>
                    {/* Score + confidence — always visible once an evaluation exists */}
                    <div className="flex flex-col items-center gap-6 rounded-xl border border-border bg-surface-1 p-8 sm:flex-row sm:justify-around">
                      <div className="flex flex-col items-center gap-2">
                        <ScoreRing score={project.aiScore} size={150} />
                        <AIScoreBadge score={project.aiScore} />
                      </div>
                      <div className="text-center sm:text-start">
                        <p className="font-heading text-lg font-bold">{t("report.overall")}</p>
                        <p className="mt-1 text-sm text-text-secondary">
                          {t("report.confidence", {
                            value: Math.round(reportData?.evaluation?.confidence_score ?? 87),
                          })}
                        </p>
                        <p className="mt-3 text-sm text-text-secondary">{t("report.asyncNote")}</p>
                      </div>
                    </div>

                    {/* overall level: only the overall score, sign-in unlocks dimensions */}
                    {reportAccess === "overall" && (
                      <EmptyState
                        icon={Lock}
                        title={t("report.gatedTitle")}
                        description={t("report.gatedDescription")}
                        action={
                          <Link href="/login">
                            <Button>{t("report.gatedCta")}</Button>
                          </Link>
                        }
                      />
                    )}

                    {/* dimensions + full: dimension scores + radar */}
                    {canViewDimensions && (
                      <>
                        <section aria-label={t("report.dimensionsTitle")}>
                          <h3 className="mb-4 font-heading text-lg font-bold">{t("report.dimensionsTitle")}</h3>
                          <div className="mb-4 rounded-xl border border-border bg-surface-1 p-6">
                            <RadarChart
                              dimensions={radar.dimensions}
                              labels={radar.labels}
                              missingDimensions={radar.missingDimensions}
                            />
                          </div>
                          <div className="space-y-4 rounded-xl border border-border bg-surface-1 p-6">
                            {dimensionKeys
                              .filter((dim) => typeof radar.dimensions[dim] === "number")
                              .map((dim) => (
                                <div key={dim} className="flex items-center gap-3">
                                  <span className="w-32 shrink-0 text-sm font-medium text-text-primary">
                                    {t(`report.dimensions.${dim}`)}
                                  </span>
                                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-0">
                                    <motion.div
                                      className={cn(
                                        "h-full rounded-full",
                                        tier === "excellent" || tier === "good"
                                          ? "bg-primary-600"
                                          : tier === "medium"
                                            ? "bg-warning"
                                            : "bg-danger"
                                      )}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${radar.dimensions[dim]}%` }}
                                      transition={{ duration: 0.8, delay: 0.1 * dimensionKeys.indexOf(dim), ease: "easeOut" }}
                                    />
                                  </div>
                                  <span className="w-10 text-end font-heading text-sm font-bold text-text-primary">
                                    {radar.dimensions[dim]}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </section>

                        {/* full level only: warnings + SWOT + gaps + recommendations + skills + export */}
                        {canViewFull && (
                          <>
                            {Array.isArray(reportData?.evaluation?.warnings) &&
                              reportData.evaluation.warnings.length > 0 && (
                                <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-tint-warning px-3 py-2 text-sm text-warning-ink">
                                  <WarningCircle size={18} className="mt-0.5 shrink-0" weight="bold" aria-hidden />
                                  <ul className="space-y-1">
                                    {reportData.evaluation.warnings.map((w, i) => (
                                      <li key={i}>{w}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                            <section aria-label={t("report.swot")}>
                              <h3 className="mb-4 font-heading text-lg font-bold">{t("report.swot")}</h3>
                              <div className="grid gap-4 sm:grid-cols-2">
                                {(["strengths", "weaknesses", "opportunities", "threats"]).map((key) => (
                                  <div
                                    key={key}
                                    className="rounded-xl border border-border bg-surface-1 p-5"
                                  >
                                    <h4 className={cn("mb-3 flex items-center gap-2 rounded-lg px-3 py-1.5 font-heading text-sm font-bold", swotStyles[key].header)}>
                                      <span aria-hidden className={cn("h-2.5 w-2.5 rounded-full", swotStyles[key].icon)} />
                                      {t(`report.swotItems.${key}.title`)}
                                    </h4>
                                    <ul className="space-y-2">
                                      {(swotSource[key] ?? []).map((item, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-text-primary">
                                          <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-text-secondary/50" />
                                          {typeof item === "string" ? item : locale === "ar" ? item.ar : item.en}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            </section>

                            <GapAnalysisPanel
                              gaps={reportData?.evaluation?.gap_analysis}
                              dimensionScores={dimensionScores}
                            />

                            <RecommendationsList
                              recommendations={reportData?.evaluation?.recommendations}
                            />

                            <RequiredSkillsList
                              skills={reportData?.evaluation?.required_skills}
                              teamMeta={reportData?.team_meta}
                            />

                            <div className="flex justify-end">
                              <ExportPdfButton
                                exportMeta={reportData?.export}
                                locale={locale}
                                filename={`evaluation-report-${project.evaluationId}-${locale}.pdf`}
                              />
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ============ Tab: Team ============ */}
            {tab === "team" && (
              <ul className="grid gap-4 sm:grid-cols-2">
                {team.map((member, i) => (
                  <li key={`${member.name}-${i}`} className="flex items-center gap-4 rounded-xl border border-border bg-surface-1 p-5">
                    <span
                      aria-hidden
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-heading text-lg font-bold text-white"
                      style={{ backgroundColor: avatarHue(member.name) }}
                    >
                      {initials(member.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-heading font-semibold text-text-primary">{member.name}</p>
                      <p className="text-sm text-text-secondary">{member.role}</p>
                    </div>
                    {i === 0 && <Users size={20} className="ms-auto text-primary-500" aria-hidden />}
                  </li>
                ))}
              </ul>
            )}

            {/* ============ Tab: Agreement ============ */}
            {tab === "agreement" && (
              <div className="rounded-xl border border-border bg-surface-1 p-8 text-center">
                <FilePdf size={48} weight="light" className="mx-auto text-danger" aria-hidden />
                <h3 className="mt-4 font-heading text-lg font-bold">{t("agreement.title")}</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
                  {t("agreement.description")}
                </p>
                <Button
                  className="mt-6"
                  onClick={() => toast.info(t("agreement.availableAfter"))}
                >
                  <DownloadSimple size={20} weight="bold" />
                  {t("agreement.download")}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Owner card */}
          <div className="rounded-xl border border-border bg-surface-1 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              {t("detail.owner")}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <span
                aria-hidden
                className="flex h-12 w-12 items-center justify-center rounded-full font-heading font-bold text-white"
                style={{ backgroundColor: avatarHue(project.owner.name) }}
              >
                {initials(project.owner.name)}
              </span>
              <div>
                <p className="font-heading font-semibold text-text-primary">{project.owner.name}</p>
                <p className="text-sm text-text-secondary">
                  {locale === "ar" ? project.owner.role.ar : project.owner.role.en}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-text-secondary">
              {t("detail.joined", {
                date: format.dateTime(new Date(project.owner.joinedAt), { dateStyle: "medium" }),
              })}
            </p>
          </div>

          {/* Similar projects */}
          <div className="rounded-xl border border-border bg-surface-1 p-5">
            <h3 className="font-heading text-sm font-bold text-text-primary">{t("detail.similar")}</h3>
            <ul className="mt-3 space-y-3">
              {similar.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    className="group flex items-center justify-between gap-3 rounded-lg p-2 transition-colors hover:bg-accent-100"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-text-primary group-hover:text-primary-600">
                        {locale === "ar" ? p.title.ar : p.title.en}
                      </span>
                      <span className="block text-xs text-text-secondary">{sectorText}</span>
                    </span>
                    <AIScoreBadge score={p.aiScore} showLabel={false} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick stats */}
          <div className="rounded-xl border border-border bg-surface-1 p-5">
            <h3 className="font-heading text-sm font-bold text-text-primary">{t("detail.stats.title")}</h3>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-secondary">{t("detail.stats.interested")}</dt>
                <dd className="font-semibold text-text-primary">{format.number(project.interested)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">{t("detail.stats.views")}</dt>
                <dd className="font-semibold text-text-primary">{format.number(project.views)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">{t("detail.stats.status")}</dt>
                <dd className="font-semibold text-text-primary">{statusText}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>

      <nav aria-label={t("detail.backLabel")}>
        <Link
          href="/projects"
          className="inline-flex min-h-12 items-center gap-2 text-sm font-semibold text-primary-600 hover:underline"
        >
          <CaretComponent size={18} aria-hidden />
          {t("detail.backToGallery")}
        </Link>
      </nav>
    </div>
  );
}

function StatCell({
  icon: IconComponent,
  label,
  value,
  valueClassName,
}) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <IconComponent size={20} className="text-primary-500" aria-hidden />
      <p className="text-xs text-text-secondary">{label}</p>
      <p className={cn("font-heading text-sm font-bold", valueClassName ?? "text-text-primary")}>{value}</p>
    </div>
  );
}
