"use client";

import { ArrowRight, ChartLine, Compass, PencilSimple } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Link } from "@/config/i18n/link";
import { RelativeTime } from "@/features/notifications/components/RelativeTime";
import { cn } from "@/shared/utils";

/**
 * EPIC-11 · Updates feed widget (US-060 · T101/T102) — dashboard-api.md §2.updates_feed.
 *
 * Aggregates evaluation re-scores (`evaluation_updated`) and project edits
 * (`project_edited`) for the investor's engaged set (sent interests + saved
 * projects). The backend row carries an optional `detail` string but the
 * frontend derives its own RTL copy from the type + old/new scores so the
 * Arabic text is deterministic. Zero events render the empty state with a CTA
 * to browse projects (US-060/4).
 *
 * الدستور III — RTL via next-intl; no hard-coded strings.
 */

const TYPE_META = {
  evaluation_updated: {
    icon: ChartLine,
    classes: "bg-accent-100 text-primary-600",
  },
  project_edited: {
    icon: PencilSimple,
    classes: "bg-surface-2 text-text-secondary",
  },
  generic: {
    icon: Compass,
    classes: "bg-surface-2 text-text-secondary",
  },
};

export function UpdatesFeed({ items, className }) {
  const t = useTranslations("dashboard");
  const list = Array.isArray(items) ? items : [];

  if (list.length === 0) {
    return (
      <section className={cn("rounded-xl border border-border bg-surface-1 shadow-sm", className)}>
        <SectionTitle />
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-100">
            <ChartLine size={28} weight="light" className="text-primary-600" aria-hidden />
          </span>
          <p className="font-heading font-semibold text-text-primary">
            {t("investor.updatesEmpty")}
          </p>
          <p className="max-w-sm text-sm text-text-secondary">
            {t("investor.updatesEmptyDesc")}
          </p>
          <Link
            href="/projects"
            className="mt-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-700"
          >
            <Compass size={18} weight="bold" aria-hidden />
            {t("investor.updatesEmptyCta")}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("rounded-xl border border-border bg-surface-1 shadow-sm", className)}>
      <SectionTitle />
      <ul className="divide-y divide-border/60">
        {list.map((event) => {
          const meta = TYPE_META[event.type] ?? TYPE_META.generic;
          const Icon = meta.icon;
          const project = event.project ?? {};
          const projectId = project.id;
          const projectTitle = project.title ?? "—";
          const detail = updateDetail(event, t);
          return (
            <li key={event.id}>
              <Link
                href={projectId ? `/projects/${projectId}` : "/projects"}
                className="flex items-start gap-3 p-4 transition-colors hover:bg-surface-0/70"
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    meta.classes
                  )}
                  aria-hidden
                >
                  <Icon size={20} weight="duotone" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-text-primary">
                    {projectTitle}
                  </span>
                  <span className="mt-0.5 block text-sm text-text-secondary">{detail}</span>
                  <span className="mt-1 block text-xs text-text-secondary/80">
                    <RelativeTime date={event.created_at} />
                  </span>
                </span>
                <span className="mt-2 shrink-0 text-text-secondary/70 rtl:rotate-180" aria-hidden>
                  <ArrowRight size={16} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Derive the RTL copy from the event type + scores (backend `detail` may be null). */
function updateDetail(event, t) {
  if (event.type === "evaluation_updated") {
    return t("investor.update.evaluation_updated", {
      old: event.old_score ?? "—",
      new: event.new_score ?? "—",
    });
  }
  if (event.type === "project_edited") {
    return t("investor.update.project_edited");
  }
  return event.detail ?? "";
}

function SectionTitle() {
  const t = useTranslations("dashboard");
  return (
    <h2 className="flex items-center gap-2 border-b border-border px-4 py-3 font-heading text-base font-bold text-text-primary">
      <ChartLine size={18} className="text-primary-600" aria-hidden />
      {t("investor.updatesTitle")}
    </h2>
  );
}
