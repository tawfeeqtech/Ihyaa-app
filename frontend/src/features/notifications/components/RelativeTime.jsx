"use client";

import { useEffect, useState } from "react";
import { useFormatter } from "next-intl";

/**
 * EPIC-09 · RelativeTime (T082 · US-049) — RTL-aware local relative time.
 *
 * Uses next-intl's `useFormatter().relativeTime`, which wraps
 * Intl.RelativeTimeFormat with the active locale — «قبل 5 دقائق» in ar,
 * "5 minutes ago" in en. The largest unit (year → second) is chosen so the
 * label stays compact. "now" is captured in state (keeps the render pure) and
 * refreshed on a light interval so labels never drift. Renders a
 * <time datetime=…> for machine-readability.
 */

const UNITS = [
  { unit: "year", ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: "month", ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: "day", ms: 24 * 60 * 60 * 1000 },
  { unit: "hour", ms: 60 * 60 * 1000 },
  { unit: "minute", ms: 60 * 1000 },
  { unit: "second", ms: 1000 },
];

const REFRESH_MS = 30_000;

export function RelativeTime({ date, className }) {
  const format = useFormatter();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  const value = date ? new Date(date) : null;
  if (!value || Number.isNaN(value.getTime())) return null;

  const diffMs = value.getTime() - now; // negative in the past
  const abs = Math.abs(diffMs);

  let chosen = UNITS[UNITS.length - 1];
  for (const u of UNITS) {
    if (abs >= u.ms) {
      chosen = u;
      break;
    }
  }

  const diff = Math.round(diffMs / chosen.ms);

  return (
    <time dateTime={value.toISOString()} className={className}>
      {format.relativeTime(diff, chosen.unit)}
    </time>
  );
}
