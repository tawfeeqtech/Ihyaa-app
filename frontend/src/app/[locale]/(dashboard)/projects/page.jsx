"use client";

import { useCallback, useEffect, useState } from "react";
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
import { api } from "@/shared/lib/api";
import { cn } from "@/shared/utils";

const PAGE_SIZE = 12;

/** Adapt API project shape to what ProjectCard expects. */
function mapProject(p) {
  return {
    id: p.id,
    title: { ar: p.title, en: p.title },
    description: { ar: p.description ?? "", en: p.description ?? "" },
    sector: p.category?.slug ?? "tech",
    aiScore: p.ai_score ?? 0,
    status: p.status ?? "needs_funding",
    interested: p.interested_count ?? 0,
    views: p.view_count ?? 0,
    budget: p.budget_min ?? 0,
    createdAt: p.created_at ?? new Date().toISOString(),
    owner: { name: p.owner?.name ?? "Unknown" },
  };
}

const SORT_OPTIONS = [
  { value: "newest", label: "sort.newest" },
  { value: "score", label: "sort.score" },
  { value: "popular", label: "sort.popular" },
];

export default function ProjectsGalleryPage() {
  const t = useTranslations("projects");
  const locale = useLocale();

  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("all");
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState("grid");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [meta, setMeta] = useState(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        per_page: String(PAGE_SIZE),
        page: String(page),
        sort,
      });
      if (query.trim()) params.set("q", query.trim());
      if (sector !== "all") params.set("category", sector);

      const data = await api.get(`/projects?${params.toString()}`);
      const list = Array.isArray(data) ? data : data?.data ?? [];
      setProjects(list.map(mapProject));
      setMeta(data?.meta ?? null);
    } catch {
      // Silently fall back — the empty state will show
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [query, sector, sort, page]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchProjects();
    }, 300);
    return () => clearTimeout(timer);
  }, [query, sector]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = meta?.last_page ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t("gallery.title")}</h1>
        <p className="mt-1 text-text-secondary">{t("gallery.subtitle")}</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-1 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlass size={18} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("gallery.searchPlaceholder")}
              className="w-full rounded-lg border border-border bg-surface-0 py-2.5 ps-10 pe-4 text-sm text-text-primary placeholder:text-text-secondary/70 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
            />
          </div>

          {/* Sector filter */}
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="rounded-lg border border-border bg-surface-0 px-3 py-2.5 text-sm text-text-primary focus:border-primary-600 focus:outline-none"
          >
            <option value="all">{t("gallery.allSectors")}</option>
            <option value="ai-ml">{t("sectors.ai_ml")}</option>
            <option value="healthtech">{t("sectors.healthtech")}</option>
            <option value="fintech">{t("sectors.fintech")}</option>
            <option value="edtech">{t("sectors.edtech")}</option>
            <option value="ecommerce">{t("sectors.ecommerce")}</option>
            <option value="iot">{t("sectors.iot")}</option>
            <option value="cleantech">{t("sectors.cleantech")}</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border border-border bg-surface-0 px-3 py-2.5 text-sm text-text-primary focus:border-primary-600 focus:outline-none"
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{t(label)}</option>
            ))}
          </select>

          {/* View toggle */}
          <button
            type="button"
            onClick={() => setView("grid")}
            aria-pressed={view === "grid"}
            aria-label={t("gallery.gridView")}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
              view === "grid" ? "bg-primary-600 text-white" : "text-text-secondary hover:bg-surface-0"
            )}
          >
            <SquaresFour size={18} />
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
            aria-label={t("gallery.listView")}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
              view === "list" ? "bg-primary-600 text-white" : "text-text-secondary hover:bg-surface-0"
            )}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className={cn(
          "grid gap-5",
          view === "grid" ? "sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
        )}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={MagnifyingGlass}
          title={t("gallery.noResults")}
          description={t("gallery.noResultsDesc")}
          action={
            query || sector !== "all" ? (
              <Button variant="secondary" onClick={() => { setQuery(""); setSector("all"); }}>
                {t("gallery.clearFilters")}
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <div className={cn(
            "grid gap-5",
            view === "grid" ? "sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
          )}>
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} locale={locale} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav aria-label={t("gallery.pagination")} className="flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t("gallery.prev")}
              </Button>
              <span className="text-sm text-text-secondary">
                {page} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("gallery.next")}
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
