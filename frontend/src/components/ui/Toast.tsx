"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle,
  Info,
  Warning,
  X,
  XCircle,
  type Icon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextValue {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toastConfig: Record<
  ToastType,
  { icon: Icon; iconClasses: string; barClasses: string }
> = {
  success: {
    icon: CheckCircle,
    iconClasses: "text-success",
    barClasses: "bg-success",
  },
  error: {
    icon: XCircle,
    iconClasses: "text-danger",
    barClasses: "bg-danger",
  },
  warning: {
    icon: Warning,
    iconClasses: "text-warning",
    barClasses: "bg-warning",
  },
  info: {
    icon: Info,
    iconClasses: "text-primary-500",
    barClasses: "bg-primary-500",
  },
};

/** Success toasts auto-dismiss after 3s (per design spec); others after 5s. */
const dismissAfter: Record<ToastType, number> = {
  success: 3000,
  error: 5000,
  warning: 5000,
  info: 4000,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, title: string, description?: string) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev.slice(-4), { id, type, title, description }]);
      window.setTimeout(() => dismiss(id), dismissAfter[type]);
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (title, description) => push("success", title, description),
      error: (title, description) => push("error", title, description),
      warning: (title, description) => push("warning", title, description),
      info: (title, description) => push("info", title, description),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 start-1/2 z-100 flex w-full max-w-sm -translate-x-1/2 flex-col gap-3 px-4 rtl:translate-x-1/2"
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            const config = toastConfig[toast.type];
            const IconComponent = config.icon;
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.97 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-lg border border-border bg-surface-0 p-4 shadow-lg"
                role="status"
              >
                <span
                  aria-hidden
                  className={cn("absolute inset-y-0 start-0 w-1", config.barClasses)}
                />
                <IconComponent size={22} weight="bold" className={cn("mt-0.5 shrink-0", config.iconClasses)} />
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-sm font-semibold text-text-primary">
                    {toast.title}
                  </p>
                  {toast.description && (
                    <p className="mt-0.5 text-sm text-text-secondary">
                      {toast.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  aria-label="close"
                  className="shrink-0 rounded p-1 text-text-secondary transition-colors hover:bg-surface-1 hover:text-text-primary"
                >
                  <X size={16} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
