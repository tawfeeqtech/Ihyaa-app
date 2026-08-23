"use client";

import { useEffect, useState } from "react";

/**
 * Debounce a rapidly-changing value — US-031 (T132).
 *
 * Returns the input value after `delay`ms of silence. Used by the suggestion
 * box so we never fire a request per keystroke (SRS-UI-16).
 */
export function useDebouncedSearch(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
