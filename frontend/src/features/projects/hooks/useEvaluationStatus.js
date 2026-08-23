"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchEvaluationStatus,
  postRetry,
} from "../lib/evaluation";

/** Terminal statuses stop the polling loop (T052). */
const ACTIVE_STATUSES = new Set(["pending", "processing"]);

/**
 * useEvaluationStatus — live evaluation status with polling (T052).
 *
 * Polls GET /evaluation-status every `intervalMs` while the latest evaluation
 * is `pending` or `processing`, and stops once it reaches a terminal state
 * (completed / failed / partial / never_evaluated). Bumping `refreshSignal`
 * (e.g. after a re-evaluate is queued) forces an immediate refetch and resumes
 * polling while the new run is active.
 *
 * @param {string|number} projectId
 * @param {Object} [options]
 * @param {boolean} [options.enabled=true]  Mount the poller (e.g. owner only).
 * @param {number}  [options.intervalMs=10000]
 * @param {number}  [options.refreshSignal=0] External trigger to refetch now.
 * @returns {{
 *   status: Object|null,
 *   error: Error|null,
 *   lastUpdated: Date|null,
 *   retrying: boolean,
 *   retry: () => Promise<void>,
 *   refetch: () => Promise<Object|null>,
 * }}
 */
export function useEvaluationStatus(
  projectId,
  { enabled = true, intervalMs = 10000, refreshSignal = 0 } = {}
) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [retrying, setRetrying] = useState(false);

  // Bumped after a successful retry so the polling effect re-runs and
  // schedules the next poll (the retried run is `processing` again).
  const [retryNonce, setRetryNonce] = useState(0);

  const fetchStatus = useCallback(async () => {
    if (!projectId) return null;
    const data = await fetchEvaluationStatus(projectId);
    if (data) {
      setStatus(data);
      setError(null);
      setLastUpdated(new Date());
    }
    return data;
  }, [projectId]);

  useEffect(() => {
    if (!enabled || !projectId) return;

    let cancelled = false;
    let timer = null;

    const poll = async (delay) => {
      timer = window.setTimeout(async () => {
        if (cancelled) return;
        const data = await fetchStatus();
        if (cancelled) return;
        // Keep polling only while the run is non-terminal.
        if (data && ACTIVE_STATUSES.has(data.status)) {
          poll(intervalMs);
        }
      }, delay);
    };

    poll(0);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [enabled, projectId, fetchStatus, intervalMs, refreshSignal, retryNonce]);

  /** Retry a FAILED evaluation, then resume polling for the new run. */
  const retry = useCallback(async () => {
    if (!projectId || !status?.latest_evaluation_id) return;
    setRetrying(true);
    try {
      await postRetry(projectId, status.latest_evaluation_id);
      await fetchStatus();
      setRetryNonce((n) => n + 1); // re-run effect → poll the new run
    } finally {
      setRetrying(false);
    }
  }, [projectId, status?.latest_evaluation_id, fetchStatus]);

  return {
    status,
    error,
    lastUpdated,
    retrying,
    retry,
    refetch: fetchStatus,
  };
}
