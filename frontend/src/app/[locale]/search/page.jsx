"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MagnifyingGlass, WarningCircle } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Header } from "@/shared/layout/Header";
import { Footer } from "@/shared/layout/Footer";
import { EmptyState } from "@/shared/components/EmptyState";
import { Button } from "@/shared/components/Button";
import { SkeletonCard } from "@/shared/components/Skeleton";
import PaginationBar from "@/shared/components/PaginationBar";
import { api } from "@/shared/lib/api";
import {
  SearchBar,
  FilterPanel,
  SortControl,
  SearchResultCard,
  useSearchState,
} from "@/features/search";
import { cn } from "@/shared/utils";

/**
 * Advanced search & discovery page — EPIC-06 (US-030 / US-032 / US-033 / US-035).
 *
 * - URL is the single source of truth: `useSearchState` reads params from
 *   `location.search` on mount and rewrites them via `history.replaceState`
 *   on every change, so a permalink reproduces the exact query (US-035).
 * - Live search is debounced inside SearchBar; filters/sort/page commit
 *   immediately — each commit triggers one fetch of `/api/search`.
 * - Loading → skeleton grid; empty → SRS-UI-27 (broader terms + browse-all);
 *   503 SEARCH_UNAVAILABLE → SRS-UI-28 (retry).
 */
export default function SearchPage() {
  const t = useTranslations("search");
  const { params, setParams, setPage, clearFilters, queryString, hasFilters } =
    useSearchState();

  const [state, setState] = useState(null); // { hits, pagination, facets, ... }
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const controllerRef = useRef(null);

  const fetchResults = useCallback(async () => {
    // Abort the previous in-flight request so a slow stale response can't
    // overwrite fresher results (live search fires many fetches).
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setUnavailable(false);
    try {
      const path = queryString ? `/search?${queryString}` : "/search";
      const res = await api.get(path, { signal: controller.signal });
      // api.js unwraps `data` + keeps `meta` → res.data = { hits, pagination, facets }.
      setState(res?.data ?? { hits: [], pagination: { total: 0 } });
      setLoading(false);
    } catch (err) {
      if (err?.name === "AbortError") return; // stale — ignored
      // 503 SEARCH_UNAVAILABLE (retryable) → SRS-UI-28.
      setState(null);
      setUnavailable(true);
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    fetchResults(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchResults]);

  // Abort any in-flight request when the page unmounts.
  useEffect(() => () => controllerRef.current?.abort(), []);

  const hits = state?.hits ?? [];
  const pagination = state?.pagination ?? { page: 1, per_page: 12, total: 0, total_pages: 1 };
  const facets = state?.facets ?? {};
  const total = pagination.total ?? 0;
  const totalPages = Math.max(1, pagination.total_pages ?? 1);
  const currentPage = pagination.page ?? params.page;

  /** SRS-UI-27: browse all → drop every filter and the query, keep sort. */
  const browseAll = () => {
    setParams({
      q: "",
      sector: "",
      score_min: "",
      score_max: "",
      status: "",
      tags: [],
      created_from: "",
      created_to: "",
      page: 1,
    });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-text-secondary">{t("subtitle")}</p>
        </div>

        {/* Search bar */}
        <SearchBar
          q={params.q}
          onSearch={(value) => setParams({ q: value })}
          className="mb-6"
        />

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Filters */}
          <FilterPanel
            params={params}
            setParams={setParams}
            facets={facets}
            clearFilters={clearFilters}
            className="w-full shrink-0 lg:w-72"
          />

          {/* Results column */}
          <div className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              {!loading && !unavailable && (
                <p className="text-sm text-text-secondary" aria-live="polite">
                  {t("resultsCount", { count: total })}
                </p>
              )}
              {!loading && !unavailable && (
                <SortControl params={params} setParams={setParams} className="ms-auto" />
              )}
            </div>

            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : unavailable ? (
              <EmptyState
                icon={WarningCircle}
                title={t("unavailable.title")}
                description={t("unavailable.description")}
                action={
                  <Button onClick={fetchResults}>{t("unavailable.retry")}</Button>
                }
              />
            ) : hits.length === 0 ? (
              <EmptyState
                icon={MagnifyingGlass}
                title={t("empty.title")}
                description={t("empty.description")}
                action={
                  <Button variant="secondary" onClick={browseAll}>
                    {t("empty.browseAll")}
                  </Button>
                }
              />
            ) : (
              <>
                <div
                  className={cn(
                    "grid gap-6",
                    hits.length === 1 ? "grid-cols-1" : "sm:grid-cols-2 xl:grid-cols-3"
                  )}
                >
                  {hits.map((hit) => (
                    <SearchResultCard key={String(hit.id)} hit={hit} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <PaginationBar
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    ariaLabel={t("pagination")}
                    prevLabel={t("prev")}
                    nextLabel={t("next")}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
