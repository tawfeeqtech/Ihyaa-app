"use client";

import { FolderPlus } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Link } from "@/config/i18n/link";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { cn } from "@/shared/utils";
import { ProjectMiniCard } from "./project-mini-card";

/**
 * EPIC-10 · Mini-card grid (US-051 · T053) — responsive 1→2→3→4 columns.
 *
 * Client component. With zero projects it yields to an EmptyState whose primary
 * CTA stays «أضف أول مشروع» (T068/T069) — kept here so the server page never
 * touches client-only icon imports.
 */
export function ProjectMiniCardGrid({ projects = [], className }) {
  const t = useTranslations("dashboard");

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FolderPlus}
        title={t("owner.projectsEmpty")}
        description={t("owner.projectsEmptyDesc")}
        action={
          <Link href="/projects/new">
            <Button>
              <FolderPlus size={18} weight="bold" aria-hidden />
              {t("owner.addFirstProject")}
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className
      )}
    >
      {projects.map((project) => (
        <ProjectMiniCard key={project.id} project={project} />
      ))}
    </div>
  );
}
