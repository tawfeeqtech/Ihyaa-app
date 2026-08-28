/**
 * Shared UI & utilities barrel.
 * Components, layouts, the theme provider and the tiny utility helpers
 * that are reused across features.
 */
export { Button } from "./components/Button";
export { EmptyState } from "./components/EmptyState";
export { Skeleton, SkeletonText, SkeletonCircle, SkeletonCard } from "./components/Skeleton";
export { ToastProvider, useToast } from "./components/Toast";

export { Header } from "./layout/Header";
export { Footer } from "./layout/Footer";
export { Logo } from "./layout/Logo";
export { Sidebar } from "./layout/Sidebar";
export { LocaleSwitcher } from "./layout/LocaleSwitcher";
export { DashboardErrorToast } from "./layout/DashboardErrorToast";

export { ThemeProvider, useTheme } from "./lib/ThemeProvider";

export { cn, formatNumber, initials, avatarHue, sanitizeHighlightHtml } from "./utils";
