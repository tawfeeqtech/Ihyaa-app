"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "ihyaa-theme";
const CHANGE_EVENT = "ihyaa-theme-change";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Read the theme from localStorage (or the OS preference). */
function readTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Keep subscribers in sync with storage changes, OS preference and manual toggles. */
function subscribe(callback: () => void): () => void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    // Only react to system changes when the user has no explicit choice.
    if (!localStorage.getItem(STORAGE_KEY)) callback();
  };
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  mq.addEventListener("change", onSystemChange);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
    mq.removeEventListener("change", onSystemChange);
  };
}

/**
 * Light-first (default) with optional dark mode, driven by the
 * `[data-theme]` attribute on <html>. The head script in the layout
 * pre-applies the theme to avoid a flash before hydration.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore<Theme>(subscribe, readTheme, () => "light");

  /* Sync the DOM attribute — a side effect, not state. */
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggle = useCallback(() => {
    const next: Theme = readTheme() === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
