"use client";

import { useEffect, useRef, useState } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils";
import { SuggestionBox } from "./SuggestionBox";

/**
 * Search input + suggestion dropdown — US-030 / US-031 (T117, T134).
 *
 * - The input keeps a local `draft`; the committed query lives in `q` (from
 *   the URL state). The two stay in sync: an external change to `q` (e.g. a
 *   permalink or "clear filters") rewrites the draft.
 * - Live search is debounced 300ms: after a pause in typing the draft is
 *   committed via `onSearch` (→ URL → results), so we never fire a request
 *   per keystroke (SRS-UI-16).
 * - Enter or a suggestion click commits immediately.
 * - `onSearch` commits the query; `onSuggestionSelect` is `onSearch` for the
 *   chosen term.
 */
export function SearchBar({ q, onSearch, className }) {
  const t = useTranslations("search");
  const [draft, setDraft] = useState(q ?? "");
  const [focused, setFocused] = useState(false);
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  // Combobox (WAI-ARIA): the active suggestion drives aria-activedescendant and
  // is committed on Enter. `suggestions` mirrors the rendered listbox options
  // (reported up by SuggestionBox) so the input knows the list length.
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState([]);

  // Sync the draft when the committed query changes from outside (permalink,
  // "clear search" button). While the field is focused the user owns the draft,
  // so we don't clobber in-flight typing.
  useEffect(() => {
    if (!focused) setDraft(q ?? ""); // eslint-disable-line react-hooks/set-state-in-effect
  }, [q, focused]);

  // Clean up the pending debounce timer on unmount.
  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const commitNow = (value) => {
    window.clearTimeout(timerRef.current);
    onSearch(value.trim());
  };

  const handleChange = (value) => {
    setDraft(value);
    setActiveIndex(-1); // new keystroke clears the highlighted suggestion
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      onSearch(value.trim());
    }, 300);
  };

  const handleItemsChange = (next) => {
    setSuggestions(next);
    setActiveIndex((i) => (i >= next.length ? -1 : i));
  };

  return (
    <div className={cn("relative", className)}>
      <MagnifyingGlass
        size={20}
        aria-hidden
        className="pointer-events-none absolute inset-y-0 start-4 my-auto text-text-secondary"
      />
      <input
        ref={inputRef}
        type="search"
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 150)}
        onKeyDown={(e) => {
          const listOpen = suggestions.length > 0 && draft.trim().length >= 1;
          if (e.key === "ArrowDown") {
            if (listOpen) {
              e.preventDefault();
              setActiveIndex((i) => (i < suggestions.length - 1 ? i + 1 : i));
            }
          } else if (e.key === "ArrowUp") {
            if (listOpen) {
              e.preventDefault();
              setActiveIndex((i) => (i > 0 ? i - 1 : i));
            }
          } else if (e.key === "Home") {
            if (listOpen) {
              e.preventDefault();
              setActiveIndex(0);
            }
          } else if (e.key === "End") {
            if (listOpen) {
              e.preventDefault();
              setActiveIndex(suggestions.length - 1);
            }
          } else if (e.key === "Enter") {
            if (activeIndex >= 0 && activeIndex < suggestions.length) {
              e.preventDefault();
              commitNow(suggestions[activeIndex].text);
              inputRef.current?.blur();
            } else {
              commitNow(draft);
              inputRef.current?.blur();
            }
          } else if (e.key === "Escape") {
            setFocused(false);
            inputRef.current?.blur();
          }
        }}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchLabel")}
        autoComplete="off"
        role="combobox"
        aria-expanded={focused && draft.trim().length >= 1}
        aria-controls="search-suggestions"
        aria-activedescendant={
          activeIndex >= 0 && suggestions.length > 0 ? `search-suggestions-option-${activeIndex}` : undefined
        }
        className="h-14 w-full rounded-xl border border-border bg-surface-1 ps-12 pe-12 text-text-primary placeholder:text-text-secondary/70 transition focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
      />
      {draft && (
        <button
          type="button"
          aria-label={t("clearSearch")}
          onClick={() => {
            setDraft("");
            commitNow("");
            inputRef.current?.focus();
          }}
          className="absolute inset-y-0 end-3 my-auto flex h-12 w-12 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-accent-100 hover:text-primary-600"
        >
          <X size={18} />
        </button>
      )}

      <SuggestionBox
        id="search-suggestions"
        q={draft}
        show={focused && draft.trim().length >= 1}
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
        onItemsChange={handleItemsChange}
        onSelect={(text) => {
          commitNow(text);
          setDraft(text);
          inputRef.current?.blur();
        }}
      />
    </div>
  );
}
