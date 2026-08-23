"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const STORAGE_KEY = "ihyaa-theme";
const CHANGE_EVENT = "ihyaa-theme-change";

const ThemeContext = createContext(null);

/** Read the theme from localStorage (or the OS preference). */
function readTheme() {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Light-first (default) with optional dark mode, driven by the
 * `[data-theme]` attribute on <html>. The head script in the layout
 * pre-applies the theme to avoid a flash before hydration.
 *
 * We use useState + useEffect instead of useSyncExternalStore because
 * the server snapshot ("light") and the client snapshot (from localStorage)
 * can differ — that mismatch triggers a hydration error on every page.
 * The head script in the root layout already prevents the FOUC, so
 * switching to useEffect is safe.
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");

  /* On mount, read the real theme from localStorage. The inline <head>
     script already applied the correct data-theme attribute before React
     hydrated, so there is no flash. */
  useEffect(() => {
    setTheme(readTheme());
  }, []);

  /* Keep the DOM attribute in sync and listen for external changes. */
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setTheme(mq.matches ? "dark" : "light");
      }
    };
    const onStorage = () => setTheme(readTheme());
    const onCustom = () => setTheme(readTheme());

    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGE_EVENT, onCustom);
    mq.addEventListener("change", onSystemChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHANGE_EVENT, onCustom);
      mq.removeEventListener("change", onSystemChange);
    };
  }, [theme]);

  const toggle = useCallback(() => {
    const next = readTheme() === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
