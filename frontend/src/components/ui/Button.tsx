"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "ghost"
  | "outline"
  | "outlineLight";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

/* Touch targets ≥ 48px per design-decisions.md §4 */
const baseClasses =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg font-heading font-semibold transition-all duration-300 ease-out select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary-600 text-white shadow-md hover:bg-primary-500 hover:shadow-lg",
  secondary:
    "border border-border bg-accent-100 text-text-primary shadow-sm hover:bg-accent-100/60",
  danger: "bg-danger text-white shadow-sm hover:bg-danger-ink",
  ghost: "text-text-primary hover:bg-surface-1",
  outline: "border border-border bg-transparent text-text-primary hover:bg-surface-1",
  outlineLight:
    "border border-white/60 bg-white/10 text-white hover:border-white hover:bg-white/15",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-12 px-4 text-sm",
  md: "min-h-12 px-6 text-base",
  lg: "min-h-14 px-8 text-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      className,
      children,
      disabled,
      ...rest
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          className
        )}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...rest}
      >
        {loading && (
          <span
            aria-hidden
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
