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
import { EmptyState, ErrorState } from "@/shared/components/EmptyState";
import { Button } from "@/shared/components/Button";
import PaginationBar from "@/shared/components/PaginationBar";
import { Link } from "@/config/i18n/link";
import { api } from "@/shared/lib/api";
import { mapApiProject, sectorLabels, sectorOptions } from "@/features/projects/data/projects";
import { cn } from "@/shared/utils";

const PAGE_SIZE = 12;

export default function ProjectsGalleryPage() {
  const t = useTranslations("projects");
  const tErrors = useTranslations("errors");
  const locale = useLocale();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sector, setSector] = useState("all");
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState("grid");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState(null); // null while loading
  const [error, setError] = useState(false);
  const [meta, setMeta] = useState({ current_page: 1, per_page: PAGE_SIZE, total: 0, last_page: 1 });
  const [suggestions, setSuggestions] = useState([]);

  const loading = items === null;

  /* Debounce the search query before hitting the API. */
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  /* Fetch search suggestions for the autocomplete dropdown. */
  useEffect(() => {
    let active = true;
    const q = debouncedQuery.trim();
    if (!q) return; // cleared by the search input handler
    const timer = window.setTimeout(async () => {
      try {
        const res = await api.get(`/search/suggestions?q=${encodeURIComponent(q)}`);
        // api.js unwraps { success, message, data } → data is { suggestions: [...] }.
        if (active) setSuggestions(res?.suggestions ?? []);
      } catch {
        if (active) setSuggestions([]);
      }
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [debouncedQuery]);

  const fetchProjects = useCallback(async () => {
    setError(false);
    try {
      const params = new URLSearchParams();
      const q = debouncedQuery.trim();
      if (q) params.set("q", q);
      if (sector !== "all") params.set("category", sector);
      if (sort === "topRated") {
        params.set("sort", "ai_score");
        params.set("direction", "desc");
      } else if (sort === "mostViewed") {
        params.set("sort", "view_count");
        params.set("direction", "desc");
      } else {
        params.set("sort", "created_at");
        params.set("direction", "desc");
      }
      params.set("page", String(page));
      params.set("per_page", String(PAGE_SIZE));

      const res = await api.get(`/projects?${params.toString()}`);
      setItems((res?.data ?? []).map(mapApiProject));
      setMeta(
        res?.meta ?? {
          current_page: page,
          per_page: PAGE_SIZE,
          total: (res?.data ?? []).length,
          last_page: 1,
        }
      );
    } catch {
      setError(true);
      setItems([]);
      setMeta({ current_page: 1, per_page: PAGE_SIZE, total: 0, last_page: 1 });
    }
  }, [debouncedQuery, sector, sort, page]);

  useEffect(() => {
    // Async data fetch — setState happens after await, not synchronously.
    fetchProjects(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchProjects]);

  /** Retry a failed load — back to the skeleton while the request runs. */
  const handleRetry = useCallback(() => {
    setError(false);
    setItems(null);
    fetchProjects();
  }, [fetchProjects]);

  /** Drop the search query + sector filter (keeps sort/view) and go to page 1. */
  const clearFilters = useCallback(() => {
    setQuery("");
    setSector("all");
    setPage(1);
  }, []);

  const totalPages = Math.max(1, meta.last_page ?? 1);
  const total = meta.total ?? 0;

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
            setSuggestions([]);
            setPage(1);
          }}
          placeholder={t("gallery.searchPlaceholder")}
          aria-label={t("gallery.searchLabel")}
          autoComplete="off"
          className="h-14 w-full rounded-xl border border-border bg-surface-1 ps-12 pe-4 text-text-primary placeholder:text-text-secondary/70 transition focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
        />

        {/* Search suggestions */}
        {suggestions.length > 0 && (
          <ul
            role="listbox"
            aria-label={t("gallery.searchLabel")}
            className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-border bg-surface-1 shadow-lg"
          >
            {suggestions.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    setQuery(s);
                    setSuggestions([]);
                    setPage(1);
                  }}
                  className="flex min-h-12 w-full items-center gap-2 px-4 text-start text-sm text-text-primary transition-colors hover:bg-accent-100 hover:text-primary-600"
                >
                  <MagnifyingGlass size={16} className="shrink-0 text-text-secondary" aria-hidden />
                  <span className="truncate">{s}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Filters + sort */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t("gallery.filters")}>
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
              {locale === "ar" ? sectorLabels[s]?.ar : sectorLabels[s]?.en}
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
      ) : error ? (
        <ErrorState
          title={tErrors("title")}
          description={tErrors("description")}
          onRetry={handleRetry}
          retryLabel={tErrors("retry")}
          action={
            query || sector !== "all" ? (
              <Button variant="secondary" onClick={clearFilters}>
                {t("gallery.clearFilters")}
              </Button>
            ) : undefined
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={MagnifyingGlass}
          title={t("gallery.emptyTitle")}
          description={t("gallery.emptyDescription")}
          action={
            query || sector !== "all" ? (
              <Button variant="secondary" onClick={clearFilters}>
                {t("gallery.clearFilters")}
              </Button>
            ) : undefined
          }
        />
      ) : view === "grid" ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <PaginationBar
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          ariaLabel={t("gallery.pagination")}
          prevLabel={t("gallery.prev")}
          nextLabel={t("gallery.next")}
        />
      )}

      <p className="text-center text-xs text-text-secondary">
        {t("gallery.count", { count: total })}
      </p>
    </div>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "shrink-0 inline-flex min-h-12 items-center justify-center rounded-full border px-4 text-sm font-medium transition-all duration-300",
        active
          ? "border-primary-600 bg-primary-600 text-on-primary shadow-md"
          : "border-border bg-surface-1 text-text-secondary hover:border-primary-500 hover:text-text-primary"
      )}
    >
      {children}
    </button>
  );
}
