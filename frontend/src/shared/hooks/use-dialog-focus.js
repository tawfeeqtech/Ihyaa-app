"use client";

import { useEffect, useRef } from "react";

/**
 * Minimal focus trap for modal dialogs (SRS-UI-A11 · modal behaviour).
 *
 * On open:
 *  - remembers the element that currently has focus (the trigger),
 *  - moves focus to the first focusable control inside the dialog,
 *  - cycles Tab / Shift+Tab inside the dialog,
 *  - closes on Escape via `onClose`.
 * On close it hands focus back to the trigger.
 *
 * Usage:
 *   const { containerRef } = useDialogFocus({ open, onClose });
 *   ...
 *   <motion.div ref={containerRef} role="alertdialog" tabIndex={-1} ...>
 *
 * The dialog element should be focusable (`tabIndex={-1}`) so it can receive
 * focus as a fallback when no control inside is focusable (e.g. while a
 * submit button is in its loading/disabled state).
 */
export function useDialogFocus({ open, onClose }) {
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const onCloseRef = useRef(onClose);

  // Keep the latest close handler without re-running the focus effect.
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const container = containerRef.current;
    // Capture the trigger before anything moves focus, so we can restore it.
    triggerRef.current = document.activeElement;

    // Wait a frame for the enter animation to start so focus lands cleanly.
    const focusTimer = window.setTimeout(() => {
      if (!container) return;
      const focusables = getFocusable(container);
      (focusables[0] ?? container).focus({ preventScroll: true });
    }, 0);

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== "Tab" || !container) return;

      const focusables = getFocusable(container);
      if (focusables.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || !container.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !container.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
      const trigger = triggerRef.current;
      if (trigger && typeof trigger.focus === "function") {
        trigger.focus({ preventScroll: true });
      }
    };
  }, [open]);

  return { containerRef };
}

/** Visible, focusable controls inside the dialog (excludes disabled + tabindex=-1). */
function getFocusable(container) {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => el.offsetParent !== null || el === container);
}
