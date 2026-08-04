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
  Link as LinkIcon,
  Lock,
  Users,
  VideoCamera,
} from "@phosphor-icons/react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { AIScoreBadge, getScoreTier } from "@/components/ui/AIScoreBadge";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { SkeletonText } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import type { Project } from "@/lib/mock-data";
import { projects, sectorLabels, statusLabels } from "@/lib/mock-data";
import { avatarHue, cn, initials } from "@/lib/utils";

type TabKey = "overview" | "report" | "team" | "agreement";

/** Demo auth detection — reads the (non-httpOnly) demo cookie set at login. */
function useDemoAuth() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    // Deferred read so SSR HTML and the first client render agree.
    const timer = window.setTimeout(() => {
      setAuthed(document.cookie.includes("ihyaa_token="));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  return authed;
}

const dimensionKeys = ["technical", "innovation", "market", "team", "documentation"] as const;

const swotStyles = {
  strengths: { header: "text-success-ink bg-tint-success", icon: "bg-success" },
  weaknesses: { header: "text-danger-ink bg-tint-danger", icon: "bg-danger" },
  opportunities: { header: "text-primary-600 bg-accent-100", icon: "bg-primary-600" },
  threats: { header: "text-warning-ink bg-tint-warning", icon: "bg-warning" },
} as const;

export function ProjectDetail({ project }: { project: Project }) {
  const t = useTranslations("projects");
  const locale = useLocale();
  const format = useFormatter();
  const toast = useToast();
  const router = useRouter();
  const authed = useDemoAuth();

  const [tab, setTab] = useState<TabKey>("overview");
  const [interestSent, setInterestSent] = useState(false);
  const [saved, setSaved] = useState(false);
  const [aiLoading, setAiLoading] = useState(true);

  const title = locale === "ar" ? project.title.ar : project.title.en;
  const description = locale === "ar" ? project.description.ar : project.description.en;
  const sectorText = locale === "ar" ? sectorLabels[project.sector].ar : sectorLabels[project.sector].en;
  const statusText = locale === "ar" ? statusLabels[project.status].ar : statusLabels[project.status].en;
  const tier = getScoreTier(project.aiScore);

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

  function handleInterested() {
    if (!authed) {
      toast.info(t("detail.loginRequired"));
      router.push("/login");
      return;
    }
    setInterestSent(true);
    toast.success(t("detail.interestSent"));
  }

  const CaretComponent = locale === "ar" ? CaretLeft : CaretRight;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: t("detail.tabs.overview") },
    { key: "report", label: t("detail.tabs.report") },
    { key: "team", label: t("detail.tabs.team") },
    { key: "agreement", label: t("detail.tabs.agreement") },
  ];

  return (
    <div className="space-y-6">
      {/* Cover header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-500 to-primary-600 pattern-islamic px-6 pb-24 pt-16 sm:px-10 sm:pb-28 sm:pt-20">
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
      <div className="-mt-16 sm:-mt-20">
        <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-surface-0 p-5 shadow-lg sm:p-6">
          <div className="grid grid-cols-2 items-center gap-4 sm:grid-cols-4">
            <div className="flex flex-col items-center gap-2">
              <ScoreRing score={project.aiScore} size={110} />
            </div>
            <StatCell icon={CalendarBlank} label={t("detail.stats.date")} value={format.dateTime(new Date(project.createdAt), { dateStyle: "medium" })} />
            <StatCell icon={Eye} label={t("detail.stats.views")} value={format.number(project.views)} />
            <StatCell
              icon={Heart}
              label={t("detail.stats.budget")}
              value={format.number(project.budget, { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
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
                  <div className="overflow-hidden rounded-xl border border-border bg-surface-1">
                    <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                      <VideoCamera size={18} className="text-primary-600" aria-hidden />
                      <span className="text-sm font-medium text-text-primary">{t("detail.videoDemo")}</span>
                    </div>
                    <div className="aspect-video bg-surface-0 p-4">
                      <div className="flex h-full items-center justify-center rounded-lg bg-surface-1">
                        <p className="text-sm text-text-secondary">
                          {t("detail.videoPlaceholder")} — {project.videoUrl}
                        </p>
                      </div>
                    </div>
                  </div>
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
                {aiLoading ? (
                  <div className="space-y-4" aria-busy>
                    <SkeletonText lines={4} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <SkeletonText lines={3} />
                      <SkeletonText lines={3} />
                    </div>
                  </div>
                ) : !authed ? (
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
                ) : (
                  <>
                    {/* Score + confidence */}
                    <div className="flex flex-col items-center gap-6 rounded-xl border border-border bg-surface-1 p-8 sm:flex-row sm:justify-around">
                      <div className="flex flex-col items-center gap-2">
                        <ScoreRing score={project.aiScore} size={150} />
                        <AIScoreBadge score={project.aiScore} />
                      </div>
                      <div className="text-center sm:text-start">
                        <p className="font-heading text-lg font-bold">{t("report.overall")}</p>
                        <p className="mt-1 text-sm text-text-secondary">
                          {t("report.confidence", { value: 87 })}
                        </p>
                        <p className="mt-3 text-sm text-text-secondary">{t("report.asyncNote")}</p>
                      </div>
                    </div>

                    {/* Dimension bars */}
                    <section aria-label={t("report.dimensions")}>
                      <h3 className="mb-4 font-heading text-lg font-bold">{t("report.dimensions")}</h3>
                      <div className="space-y-4 rounded-xl border border-border bg-surface-1 p-6">
                        {dimensionKeys.map((dim) => (
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
                                animate={{ width: `${project.dimensions[dim]}%` }}
                                transition={{ duration: 0.8, delay: 0.1 * dimensionKeys.indexOf(dim), ease: "easeOut" }}
                              />
                            </div>
                            <span className="w-10 text-end font-heading text-sm font-bold text-text-primary">
                              {project.dimensions[dim]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* SWOT */}
                    <section aria-label={t("report.swot")}>
                      <h3 className="mb-4 font-heading text-lg font-bold">{t("report.swot")}</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {(
                          [
                            { key: "strengths" },
                            { key: "weaknesses" },
                            { key: "opportunities" },
                            { key: "threats" },
                          ] as const
                        ).map(({ key }) => (
                          <div
                            key={key}
                            className="rounded-xl border border-border bg-surface-1 p-5"
                          >
                            <h4 className={cn("mb-3 flex items-center gap-2 rounded-lg px-3 py-1.5 font-heading text-sm font-bold", swotStyles[key].header)}>
                              <span aria-hidden className={cn("h-2.5 w-2.5 rounded-full", swotStyles[key].icon)} />
                              {t(`report.swotItems.${key}.title`)}
                            </h4>
                            <ul className="space-y-2">
                              {project.swot[key].map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-text-primary">
                                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-text-secondary/50" />
                                  {locale === "ar" ? item.ar : item.en}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Gap analysis */}
                    <section aria-label={t("report.gapsTitle")}>
                      <h3 className="mb-4 font-heading text-lg font-bold">{t("report.gapsTitle")}</h3>
                      <div className="space-y-3">
                        {(["technical", "market", "team", "documentation"] as const).map((gap, i) => (
                          <div key={gap} className="flex items-start gap-4 rounded-xl border border-border bg-surface-1 p-5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-100 font-heading text-sm font-bold text-primary-600">
                              {i + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-heading text-sm font-semibold text-text-primary">
                                  {t(`report.gaps.${gap}.title`)}
                                </p>
                                <span
                                  className={cn(
                                    "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                                    i === 0
                                      ? "bg-tint-danger text-danger-ink"
                                      : i === 1
                                        ? "bg-tint-warning text-warning-ink"
                                        : "bg-tint-success text-success-ink"
                                  )}
                                >
                                  {t(`report.priority.${i === 0 ? "high" : i === 1 ? "medium" : "low"}`)}
                                </span>
                              </div>
                              <p className="mt-1.5 text-sm text-text-secondary">
                                {t(`report.gaps.${gap}.recommendation`)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
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
}: {
  icon: typeof Eye;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <IconComponent size={20} className="text-primary-500" aria-hidden />
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="font-heading text-sm font-bold text-text-primary">{value}</p>
    </div>
  );
}
