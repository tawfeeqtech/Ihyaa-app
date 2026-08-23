/**
 * Search feature barrel — EPIC-06.
 * Advanced search UI: URL-synced state, suggestion dropdown, multi-filters,
 * sort control and result cards.
 */
export { useSearchState, toSearchQueryString, SEARCH_DEFAULTS } from "./hooks/useSearchState";
export { useDebouncedSearch } from "./hooks/useDebouncedSearch";
export { SearchBar } from "./components/SearchBar";
export { SuggestionBox } from "./components/SuggestionBox";
export { FilterPanel } from "./components/FilterPanel";
export { SortControl } from "./components/SortControl";
export { SearchResultCard } from "./components/SearchResultCard";
