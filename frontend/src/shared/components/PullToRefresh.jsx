"use client";

import { useCallback, useRef, useState } from "react";
import { ArrowDown } from "@phosphor-icons/react";

const THRESHOLD = 72;
const MAX_PULL = 100;
const DAMPING = 0.5;

/**
 * PullToRefresh — سحب للأسفل لإعادة التحميل (T078 · US-049).
 *
 * Touch gesture (mobile web): while the window is scrolled to the top, pulling
 * down reveals an indicator; releasing past the threshold re-invokes
 * `onRefresh`. Desktop users get the normal refresh/load button — this wrapper
 * is purely additive. RTL-safe: no directional layout assumptions.
 */
export function PullToRefresh({ onRefresh, children, className, disabled = false }) {
  const startY = useRef(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  function handleTouchStart(e) {
    if (disabled || refreshing) return;
    if (window.scrollY > 0) return; // only pull from the very top
    startY.current = e.touches[0].clientY;
  }

  function handleTouchMove(e) {
    if (startY.current === null || disabled || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0 || window.scrollY > 0) {
      setPull(0);
      return;
    }
    setPull(Math.min(dy * DAMPING, MAX_PULL));
  }

  const handleTouchEnd = useCallback(async () => {
    if (startY.current === null) return;
    startY.current = null;
    const distance = pull;
    setPull(0);
    if (distance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      try {
        await onRefresh?.();
      } finally {
        setRefreshing(false);
      }
    }
  }, [pull, refreshing, onRefresh]);

  return (
    <div
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {(pull > 0 || refreshing) && (
        <div
          className="flex items-center justify-center overflow-hidden"
          style={{ height: refreshing ? 44 : pull }}
          aria-hidden
        >
          <ArrowDown
            size={20}
            weight="bold"
            className="text-primary-600 transition-transform duration-200"
            style={{ transform: `rotate(${refreshing || pull >= THRESHOLD ? 180 : 0}deg)` }}
          />
        </div>
      )}
      {children}
    </div>
  );
}
