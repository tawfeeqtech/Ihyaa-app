"use client";

import { useCallback, useEffect, useState } from "react";
import { Compass, Rocket, UserCircleGear } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Link } from "@/config/i18n/link";
import { Skeleton } from "@/shared/components/Skeleton";
import { useToast } from "@/shared/components/Toast";
import { api } from "@/shared/lib/api";
import { InvestorKpiGrid } from "@/features/dashboard/components/investor-kpi-grid";
import { SuggestionCard } from "@/features/dashboard/components/suggestion-card";
import { SentInterestsList } from "@/features/dashboard/components/sent-interests-list";
import { SavedProjectsList } from "@/features/dashboard/components/saved-projects-list";
import { UpdatesFeed } from "@/features/dashboard/components/updates-feed";
import { cn } from "@/shared/utils";

/**
 * EPIC-11 · Investor dashboard (US-056..060 · T082/T083/T086/T090/T091/T095/T096/T101/T102).
 *
 * Single aggregate fetch of GET /dashboard/investor (dashboard-api.md §2) —
 * kpis, profile_complete, suggestions (≤10), sent_interests, saved_projects,
 * updates_feed (≤20). Sections stack in one scrollable column; zero-activity
 * lists render their own empty states (SRS-UI-23) with a browse CTA.
 *
 * الدستور I — Level 1 suggestion cards. الدستور III — RTL Arabic-first via
 * next-intl. T086 — KPIs update on load (no streaming); cancel/remove decrement
 * the affected KPI locally.
 */

export default function InvestorDashboardPage() {
  const t = useTranslations("dashboard");
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/dashboard/investor");
      setData(res?.data ?? res ?? {});
    } catch (err) {
      toast.error(err.body?.message ?? t("investor.loadError"));
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  /** T091 — after a successful cancel, drop the row and the sent_requests KPI. */
  function handleInterestCancelled(id) {
    setData((prev) => {
      if (!prev) return prev;
      const sent = (prev.sent_interests ?? []).filter((row) => row.id !== id);
      return {
        ...prev,
        sent_interests: sent,
        kpis: {
          ...(prev.kpis ?? {}),
          sent_requests: Math.max(0, (prev.kpis?.sent_requests ?? 0) - 1),
        },
      };
    });
  }

  /** T096 — after a one-click remove, drop the row and the followed_projects KPI. */
  function handleSavedRemoved(key) {
    setData((prev) => {
      if (!prev) return prev;
      const saved = (prev.saved_projects ?? []).filter(
        (row) => (row.saved_id ?? row.project?.id) !== key
      );
      return {
        ...prev,
        saved_projects: saved,
        kpis: {
          ...(prev.kpis ?? {}),
          followed_projects: Math.max(0, (prev.kpis?.followed_projects ?? 0) - 1),
        },
      };
    });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="mt-4 h-7 w-16" />
              <Skeleton className="mt-2 h-4 w-24" />
            </div>
          ))}
        </div>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const kpis = data?.kpis ?? {};
  const profileComplete = data?.profile_complete !== false;
  const suggestions = data?.suggestions ?? [];
  const sentInterests = data?.sent_interests ?? [];
  const savedProjects = data?.saved_projects ?? [];
  const updatesFeed = data?.updates_feed ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t("investor.title")}</h1>
        <p className="mt-1 text-text-secondary">{t("investor.subtitle")}</p>
      </div>

      <InvestorKpiGrid kpis={kpis} />

      {/* T083 — incomplete-profile nudge; suggestions still fall back to best scores. */}
      {!profileComplete && (
        <div className="flex flex-col items-start gap-4 rounded-xl border border-primary-600/30 bg-accent-100/40 p-5 sm:flex-row sm:items-center">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-100">
            <UserCircleGear size={24} weight="duotone" className="text-primary-600" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-heading font-semibold text-text-primary">
              {t("investor.profileIncompleteTitle")}
            </p>
            <p className="mt-0.5 text-sm text-text-secondary">
              {t("investor.profileIncompleteDesc")}
            </p>
          </div>
          <Link
            href="/profile"
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            {t("investor.profileIncompleteCta")}
          </Link>
        </div>
      )}

      {/* Suggestions (US-056) */}
      <section className="space-y-4" aria-labelledby="suggestions-title">
        <SectionHeading id="suggestions-title" icon={Rocket} title={t("investor.suggestionsTitle")} />
        {suggestions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface-1 py-12 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-100">
              <Compass size={28} weight="light" className="text-primary-600" aria-hidden />
            </span>
            <p className="font-heading font-semibold text-text-primary">
              {t("investor.suggestionsEmpty")}
            </p>
            <p className="max-w-sm text-sm text-text-secondary">
              {t("investor.suggestionsEmptyDesc")}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {suggestions.map((s) => (
              <SuggestionCard key={s.id} suggestion={s} />
            ))}
          </div>
        )}
      </section>

      {/* Sent interests + saved projects side by side (US-058/US-059) */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <SentInterestsList
          items={sentInterests}
          onCancelled={handleInterestCancelled}
          className="h-full"
        />
        <SavedProjectsList
          items={savedProjects}
          onRemoved={handleSavedRemoved}
          className="h-full"
        />
      </div>

      {/* Updates feed (US-060) */}
      <UpdatesFeed items={updatesFeed} />
    </div>
  );
}

function SectionHeading({ id, icon: Icon, title }) {
  return (
    <h2
      id={id}
      className={cn(
        "flex items-center gap-2 border-b border-border pb-2 font-heading text-lg font-bold text-text-primary"
      )}
    >
      <Icon size={20} className="text-primary-600" aria-hidden />
      {title}
    </h2>
  );
}
