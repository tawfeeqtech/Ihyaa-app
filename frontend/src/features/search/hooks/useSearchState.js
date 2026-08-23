"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "@/config/i18n/link";

/**
 * Full search-state ↔ URL sync — US-032 (T125), US-033 (T138), US-035 (T140).
 *
 * Every filter/sort/page change is written back to the URL with
 * `window.history.replaceState` (no reload, no history spam). The URL is the
 * single source of truth: a permalink opened in a new tab rebuilds the exact
 * same query because state is read from `location.search` on mount.
 *
 * Invalid values are clamped/ignored defensively (mirrors the backend
 * whitelist — US-035-S4):
 *  - page / per_page → clamped to their valid ranges
 *  - score_min / score_max → clamped to [0,100]; non-numeric → ignored
 *  - status / sort / dir → whitelist; unknown → safe default
 *  - dates → Y-m-d only
 */

const SORTS = ["score", "created_at", "views_count"];
const DIRS = ["asc", "desc"];
const STATUSES = ["completed", "needs_development", "needs_funding"];
const DEFAULT_PER_PAGE = 12;
const MAX_PER_PAGE = 24;
const MAX_Q_LENGTH = 100;

export const SEARCH_DEFAULTS = {
  q: "",
  sector: "",
  score_min: "",
  score_max: "",
  status: "",
  tags: [],
  created_from: "",
  created_to: "",
  sort: "score",
  dir: "desc",
  page: 1,
  per_page: DEFAULT_PER_PAGE,
};

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function clampScore(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return String(Math.max(0, Math.min(100, Math.round(n))));
}

function cleanDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function cleanQuery(value) {
  return typeof value === "string" ? value.trim().slice(0, MAX_Q_LENGTH) : "";
}

/** Read + sanitise state from a URL query string. */
function readFromSearch(search) {
  const sp = new URLSearchParams(search);

  // tags[]=a&tags[]=b (contract §3) — fallback to indexed tags[0]= form.
  let tags = sp.getAll("tags[]").filter(Boolean);
  if (tags.length === 0) {
    let i = 0;
    while (sp.has(`tags[${i}]`)) {
      tags.push(sp.get(`tags[${i}]`) ?? "");
      i += 1;
    }
    tags = tags.filter(Boolean);
  }

  const sort = sp.get("sort");
  const dir = sp.get("dir");

  return {
    q: cleanQuery(sp.get("q")),
    sector: cleanQuery(sp.get("sector")).slice(0, 120),
    score_min: clampScore(sp.get("score_min")),
    score_max: clampScore(sp.get("score_max")),
    status: STATUSES.includes(sp.get("status") ?? "") ? sp.get("status") : "",
    tags,
    created_from: cleanDate(sp.get("created_from")),
    created_to: cleanDate(sp.get("created_to")),
    sort: SORTS.includes(sort) ? sort : SEARCH_DEFAULTS.sort,
    dir: DIRS.includes(dir) ? dir : SEARCH_DEFAULTS.dir,
    page: clampInt(sp.get("page"), 1, Number.MAX_SAFE_INTEGER, SEARCH_DEFAULTS.page),
    per_page: clampInt(
      sp.get("per_page"),
      1,
      MAX_PER_PAGE,
      SEARCH_DEFAULTS.per_page
    ),
  };
}

/** Serialise state to the canonical query string used by the API + URL. */
export function toSearchQueryString(p) {
  const parts = [];

  if (p.q) parts.push(`q=${encodeURIComponent(p.q)}`);
  if (p.sector) parts.push(`sector=${encodeURIComponent(p.sector)}`);
  if (p.score_min !== "") parts.push(`score_min=${p.score_min}`);
  if (p.score_max !== "") parts.push(`score_max=${p.score_max}`);
  if (p.status) parts.push(`status=${encodeURIComponent(p.status)}`);
  for (const tag of p.tags) parts.push(`tags[]=${encodeURIComponent(tag)}`);
  if (p.created_from) parts.push(`created_from=${encodeURIComponent(p.created_from)}`);
  if (p.created_to) parts.push(`created_to=${encodeURIComponent(p.created_to)}`);
  parts.push(`sort=${p.sort}`);
  parts.push(`dir=${p.dir}`);
  parts.push(`page=${p.page}`);
  if (p.per_page !== DEFAULT_PER_PAGE) parts.push(`per_page=${p.per_page}`);

  return parts.join("&");
}

export function useSearchState() {
  const pathname = usePathname();
  const [params, setParamsState] = useState(() => {
    if (typeof window === "undefined") return SEARCH_DEFAULTS;
    return readFromSearch(window.location.search);
  });

  // Keep a ref so callbacks always see the latest value without re-binding.
  // Synced in an effect (not during render) per the React refs rule.
  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  const writeUrl = useCallback((next) => {
    if (typeof window === "undefined") return;
    const qs = toSearchQueryString(next);
    const base = window.location.pathname;
    window.history.replaceState(null, "", qs ? `${base}?${qs}` : base);
  }, []);

  const commit = useCallback(
    (next) => {
      paramsRef.current = next;
      writeUrl(next);
      setParamsState(next);
    },
    [writeUrl]
  );

  /**
   * Merge a partial patch into the current state.
   * - resetPage: true (default) resets to page 1 on any filter/sort change.
   * - Pass `page` explicitly to keep a specific page (e.g. pagination).
   */
  const setParams = useCallback(
    (patch, { resetPage = true } = {}) => {
      const next = { ...paramsRef.current, ...patch };
      if (resetPage && patch.page === undefined) next.page = 1;
      commit(next);
    },
    [commit]
  );

  const setPage = useCallback(
    (page) => {
      const next = {
        ...paramsRef.current,
        page: clampInt(page, 1, Number.MAX_SAFE_INTEGER, paramsRef.current.page),
      };
      commit(next);
    },
    [commit]
  );

  /** Clear all filters but keep the free-text query and the sort. */
  const clearFilters = useCallback(() => {
    const prev = paramsRef.current;
    commit({
      ...SEARCH_DEFAULTS,
      q: prev.q,
      sort: prev.sort,
      dir: prev.dir,
      per_page: prev.per_page,
      page: 1,
    });
  }, [commit]);

  // Hard navigation to the same page with a different query (e.g. permalink
  // via Link) + browser back/forward → re-read the URL.
  useEffect(() => {
    setParamsState(readFromSearch(window.location.search)); // eslint-disable-line react-hooks/set-state-in-effect
  }, [pathname]);

  useEffect(() => {
    const onPop = () => setParamsState(readFromSearch(window.location.search));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const queryString = useMemo(() => toSearchQueryString(params), [params]);

  const hasFilters = Boolean(
    params.sector ||
      params.status ||
      params.tags.length ||
      params.score_min !== "" ||
      params.score_max !== "" ||
      params.created_from ||
      params.created_to
  );

  return { params, setParams, setPage, clearFilters, queryString, hasFilters };
}
