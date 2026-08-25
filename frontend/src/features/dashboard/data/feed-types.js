/**
 * EPIC-10 · Dashboard feed type catalogue (US-053 · T063/T064).
 *
 * Mirrors the backend OwnerEventsFeedService::TYPE_MAP (dashboard-api.md §1.feed)
 * and the raw notification types from GET /api/notifications (EPIC-09). The
 * dashboard feed uses the mapped `_feed_type` values; the events page receives
 * raw notification types and normalizes them through the same catalogue so the
 * two surfaces stay visually consistent (مبدأ I — إفصاح).
 */

import {
  CheckCircle,
  ChartLine,
  Handshake,
  PencilSimple,
  Prohibit,
  Sparkle,
  Trash,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";

/** Raw notification type → dashboard feed type (mirror of the backend map). */
export const RAW_TYPE_MAP = {
  interest_new: "interest_received",
  interest_accepted: "interest_accepted",
  interest_rejected: "interest_rejected",
  interest_cancelled: "interest_cancelled",
  evaluation_completed: "evaluation_completed",
  evaluation_partial: "evaluation_completed",
  evaluation_failed: "evaluation_failed",
  project_updated: "project_edited",
  project_trashed: "project_trashed",
  analysis_completed: "analysis_completed",
  pdf_generation_failed: "evaluation_failed",
};

/** Map a raw notification type to its dashboard feed type. */
export function toFeedType(rawType) {
  return RAW_TYPE_MAP[rawType] ?? rawType ?? "generic";
}

/** Icon, tint classes and message-key suffix for each dashboard feed type. */
export const FEED_TYPE_META = {
  interest_received: {
    icon: Handshake,
    classes: "bg-accent-100 text-primary-600",
    key: "interest_received",
  },
  interest_accepted: {
    icon: CheckCircle,
    classes: "bg-tint-success text-success",
    key: "interest_accepted",
  },
  interest_rejected: {
    icon: XCircle,
    classes: "bg-tint-danger text-danger",
    key: "interest_rejected",
  },
  interest_cancelled: {
    icon: Prohibit,
    classes: "bg-surface-2 text-text-secondary",
    key: "interest_cancelled",
  },
  evaluation_completed: {
    icon: ChartLine,
    classes: "bg-accent-100 text-primary-600",
    key: "evaluation_completed",
  },
  evaluation_failed: {
    icon: WarningCircle,
    classes: "bg-tint-danger text-danger",
    key: "evaluation_failed",
  },
  project_edited: {
    icon: PencilSimple,
    classes: "bg-surface-2 text-text-secondary",
    key: "project_edited",
  },
  project_trashed: {
    icon: Trash,
    classes: "bg-surface-2 text-text-secondary",
    key: "project_trashed",
  },
  analysis_completed: {
    icon: Sparkle,
    classes: "bg-tint-success text-success",
    key: "analysis_completed",
  },
  generic: {
    icon: Handshake,
    classes: "bg-surface-2 text-text-secondary",
    key: "generic",
  },
};

/** Resolve metadata for a raw or mapped type. */
export function feedTypeMeta(type) {
  return FEED_TYPE_META[toFeedType(type)] ?? FEED_TYPE_META.generic;
}
