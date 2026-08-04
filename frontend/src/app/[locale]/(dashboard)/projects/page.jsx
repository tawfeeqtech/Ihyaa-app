"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FunnelSimple,
  List,
  MagnifyingGlass,
  SquaresFour,
} from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { ProjectCard } from "@/features/projects/components/ProjectCard";
import { SkeletonCard } from "@/shared/components/Skeleton";
import { EmptyState } from "@/shared/components/EmptyState";
import { Button } from "@/shared/components/Button";
import { Link } from "@/config/i18n/link";
import { projects, sectorLabels, sectorOptions } from "@/features/projects/data/projects";
import { cn } from "@/shared/utils";

const PAGE_SIZE = 12;

export default function ProjectsGalleryPage() {
  const t = useTranslations("projects");
  const locale = useLocale();

  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("all");
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState("grid");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  /* Simulate the first data fetch with skeletons (no spinners for AI-grade UX). */
  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 500);
    return () => window.clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = projects.filter((p) => {
      const matchesQuery =
        !q ||
        p.title.ar.toLowerCase().includes(q) ||
        p.title.en.toLowerCase().includes(q) ||
        p.description.ar.toLowerCase().includes(q) ||
        p.description.en.toLowerCase().includes(q) ||
        p.tags.some((tag) => tag.toLowerCase().includes(q));
      const matchesSector = sector === "all" || p.sector === sector;
      return matchesQuery && matchesSector;
    });

    list = [...list].sort((a, b) => {
      if (sort === "topRated") return b.aiScore - a.aiScore;
      if (sort === "mostViewed") return b.views - a.views;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return list;
  }, [query, sector, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t("gallery.title")}</h1>
          <p className="mt-1 text-text-secondary">{t("gallery.subtitle")}</p>
        </div>
        <Link href="/projects/new">
          <Button size="md">{t("gallery.upload")}</Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlass
          size={20}
          aria-hidden
          className="pointer-events-none absolute inset-y-0 start-4 my-auto text-text-secondary"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder={t("gallery.searchPlaceholder")}
          aria-label={t("gallery.searchLabel")}
          className="h-14 w-full rounded-xl border border-border bg-surface-1 ps-12 pe-4 text-text-primary placeholder:text-text-secondary/70 transition focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
        />
      </div>

      {/* Filters + sort */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={t("gallery.filters")}>
          <FilterChip active={sector === "all"} onClick={() => { setSector("all"); setPage(1); }}>
            {t("gallery.all")}
          </FilterChip>
          {sectorOptions.map((s) => (
            <FilterChip
              key={s}
              active={sector === s}
              onClick={() => {
                setSector(s);
                setPage(1);
              }}
            >
              {locale === "ar" ? sectorLabels[s].ar : sectorLabels[s].en}
            </FilterChip>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <FunnelSimple size={18} className="text-text-secondary" aria-hidden />
          <label htmlFor="sort" className="sr-only">
            {t("gallery.sort")}
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="h-12 rounded-lg border border-border bg-surface-1 px-3 text-sm text-text-primary focus:border-primary-600 focus:outline-none"
          >
            <option value="newest">{t("gallery.sortNewest")}</option>
            <option value="topRated">{t("gallery.sortTopRated")}</option>
            <option value="mostViewed">{t("gallery.sortMostViewed")}</option>
          </select>

          <div className="flex overflow-hidden rounded-lg border border-border" role="group" aria-label={t("gallery.viewMode")}>
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-pressed={view === "grid"}
              className={cn(
                "flex h-12 w-12 items-center justify-center transition-colors",
                view === "grid" ? "bg-accent-100 text-primary-600" : "bg-surface-1 text-text-secondary hover:text-text-primary"
              )}
            >
              <SquaresFour size={18} />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              className={cn(
                "flex h-12 w-12 items-center justify-center border-s border-border transition-colors",
                view === "list" ? "bg-accent-100 text-primary-600" : "bg-surface-1 text-text-secondary hover:text-text-primary"
              )}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div
          className={cn(
            "grid gap-6",
            view === "grid" ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
          )}
        >
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={MagnifyingGlass}
          title={t("gallery.emptyTitle")}
          description={t("gallery.emptyDescription")}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery("");
                setSector("all");
              }}
            >
              {t("gallery.clearFilters")}
            </Button>
          }
        />
      ) : view === "grid" ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {pageItems.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <ul className="space-y-4">
          {pageItems.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <nav aria-label={t("gallery.pagination")} className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {t("gallery.prev")}
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              aria-current={n === page ? "page" : undefined}
              className={cn(
                "min-h-12 w-12 rounded-lg font-heading text-sm font-semibold transition-colors",
                n === page
                  ? "bg-primary-600 text-white shadow-md"
                  : "text-text-secondary hover:bg-surface-1"
              )}
            >
              {n}
            </button>
          ))}
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("gallery.next")}
          </Button>
        </nav>
      )}

      <p className="text-center text-xs text-text-secondary">
        {t("gallery.count", { count: filtered.length })}
      </p>
    </div>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-4 py-2.5 text-sm font-medium transition-all duration-300",
        active
          ? "border-primary-600 bg-primary-600 text-white shadow-md"
          : "border-border bg-surface-1 text-text-secondary hover:border-primary-500 hover:text-text-primary"
      )}
    >
      {children}
    </button>
  );
}
