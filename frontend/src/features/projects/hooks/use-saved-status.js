"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/shared/components/Toast";
import {
  fetchSavedProjects,
  isProjectSaved,
  saveProject,
  unsaveProject,
} from "@/features/projects/lib/saved-projects";

/**
 * EPIC-11 · use-saved-status (US-059 · T094).
 *
 * Real save/unsave wiring for the ProjectDetail bookmark (replaces the previous
 * fake local toggle). On mount (when authenticated) it fetches the saved list
 * once so the button reflects the real state; `toggle` optimistically flips the
 * local flag, calls the API, and re-syncs — rolling back the flag on failure.
 *
 * The dashboard aggregate exposes `saved_projects` (dashboard-api.md §2), but a
 * single project detail page has no such aggregate — a one-off GET
 * /saved-projects?per_page=100 is the cheapest source of truth (the saved list
 * per investor is small in MVP).
 */

export function useSavedStatus(projectId, { authed = true } = {}) {
  const t = useTranslations("projects");
  const toast = useToast();

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(Boolean(authed));

  const refresh = useCallback(async () => {
    if (!authed) {
      setSaved(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchSavedProjects({ perPage: 100 });
      const list = res?.data ?? [];
      setSaved(isProjectSaved(projectId, list));
    } catch {
      // Network/4xx — leave the button in the default unsaved state; the user
      // can still click save and the optimistic path will surface errors.
      setSaved(false);
    } finally {
      setLoading(false);
    }
  }, [authed, projectId]);

  useEffect(() => {
    refresh(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [refresh]);

  const toggle = useCallback(async () => {
    const previous = saved;
    setSaved((s) => !s); // optimistic
    try {
      if (previous) {
        await unsaveProject(projectId);
        toast.success(t("detail.unsaved"));
      } else {
        await saveProject(projectId);
        toast.success(t("detail.saved"));
      }
      await refresh();
    } catch (err) {
      setSaved(previous); // rollback
      toast.error(
        err.body?.message ?? (previous ? t("detail.unsaved") : t("detail.save"))
      );
    }
  }, [saved, projectId, refresh, toast, t]);

  return { saved, loading, toggle, refresh };
}
