"use client";

import { useEffect, useRef, useState } from "react";
import { MagnifyingGlass, Tag } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { api } from "@/shared/lib/api";
import { useDebouncedSearch } from "@/features/search/hooks/useDebouncedSearch";

/**
 * Live suggestion dropdown — US-031 (T132, T133).
 *
 * Debounces the query 300ms and cancels stale requests via AbortController
 * (Edge Case, search-api.md §2). Renders up to 5 de-duplicated suggestions:
 * project titles (with the engine's `<strong>` highlight) and tag terms.
 *
 * The parent passes the raw input `q`; the box decides when to fetch
 * (q.trim().length >= 2). `onSelect(text)` commits the chosen term.
 */
export function SuggestionBox({ id, q, onSelect, show = false, className }) {
  const t = useTranslations("search.suggestions");
  const debounced = useDebouncedSearch(q, 300);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const controllerRef = useRef(null);

  // Fetch on debounced query change. Stale responses are ignored both by the
  // AbortController and by an `active` flag that survives request ordering.
  useEffect(() => {
    const query = debounced.trim();

    // Abort the previous in-flight request (stale-response discarding).
    controllerRef.current?.abort();

    if (query.length < 2) {
      // Box hidden below 2 chars — clear stale suggestions immediately.
      setItems([]); // eslint-disable-line react-hooks/set-state-in-effect
      setLoading(false);
      setError(false);
      return undefined;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    let active = true;

    setLoading(true);
    setError(false);

    api
      .get(`/search/suggestions?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
      .then((res) => {
        if (!active) return;
        // api.js unwraps `data` → res is { query, suggestions, took_ms }.
        const suggestions = Array.isArray(res?.suggestions) ? res.suggestions : [];
        // De-duplicate by type+text, cap at 5 (FR-241).
        const seen = new Set();
        const unique = suggestions.filter((s) => {
          const key = `${s.type}:${s.text}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setItems(unique.slice(0, 5));
        setLoading(false);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return; // stale — ignore
        if (!active) return;
        setItems([]);
        setLoading(false);
        setError(true);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [debounced]);

  const visible =
    show && (loading || items.length > 0 || (error && debounced.trim().length >= 2));

  return (
    <div className={className}>
      {visible && (
        <ul
          id={id}
          role="listbox"
          aria-label={t("label")}
          className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-border bg-surface-1 py-1 shadow-lg"
        >
          {loading && items.length === 0 ? (
            <li className="px-4 py-3 text-sm text-text-secondary">{t("empty")}</li>
          ) : null}

          {!loading && error && items.length === 0 && (
            <li className="px-4 py-3 text-sm text-text-secondary">{t("empty")}</li>
          )}

          {items.map((item) => {
            const key = `${item.type}:${item.text}`;
            const isProject = item.type === "project_title";
            return (
              <li key={key}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => onSelect(item.text)}
                  className="flex min-h-12 w-full items-center gap-3 px-4 text-start text-sm text-text-primary transition-colors hover:bg-accent-100 hover:text-primary-600"
                >
                  {isProject ? (
                    <MagnifyingGlass
                      size={16}
                      className="shrink-0 text-text-secondary"
                      aria-hidden
                    />
                  ) : (
                    <Tag size={16} className="shrink-0 text-text-secondary" aria-hidden />
                  )}
                  {isProject && item.highlighted ? (
                    // The engine highlights the match in <strong> — it owns the markup.
                    <span
                      className="truncate"
                      dangerouslySetInnerHTML={{ __html: item.highlighted }}
                    />
                  ) : (
                    <span className="truncate">{item.text}</span>
                  )}
                  <span className="ms-auto shrink-0 text-xs text-text-secondary">
                    {isProject ? t("project") : t("tag")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
