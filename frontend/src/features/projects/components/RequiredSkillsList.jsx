"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, ShareNetwork, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/shared/components/Button";
import { GAP_TO_DIMENSION } from "../lib/report";

/**
 * RequiredSkillsList — المهارات المطلوبة (T101 · US-027).
 *
 * `required_skills` تبقى مسطّحة (كما في العقد) ويصنّفها `team_meta` إلى
 * **موجودة في الفريق** مقابل **ناقصة**. كل مهارة ناقصة تُربط بالفجوة التي تسدها
 * (T101) عبر `skillGapShort` — ترجمة منطقية من اسم المهارة إلى فئة فجوة —
 * مع نسخ/مشاركة القائمة (T102) عبر الحافظة أو Web Share.
 *
 * @param {string[]} skills       evaluation.required_skills (flat, contract shape)
 * @param {Object}   teamMeta     { existing_skills: [], missing_skills: [],
 *                                  has_team_data: bool, warning: string|null }
 */
const EMPTY_ARRAY = [];

export function RequiredSkillsList({ skills = EMPTY_ARRAY, teamMeta = null }) {
  const t = useTranslations("projects");
  const [copied, setCopied] = useState(false);

  const meta = teamMeta ?? null;
  const existing =
    meta && Array.isArray(meta.existing_skills) ? meta.existing_skills : EMPTY_ARRAY;
  const missing =
    meta && Array.isArray(meta.missing_skills)
      ? meta.missing_skills
      : Array.isArray(skills)
        ? skills
        : EMPTY_ARRAY;
  const hasTeamData = meta?.has_team_data ?? false;
  const warning = meta?.warning ?? null;

  const hasAny = existing.length > 0 || missing.length > 0;

  const shareText = useMemo(() => {
    const lines = [t("report.skillsShareTitle")];
    if (existing.length > 0) {
      lines.push(`${t("report.skillsExisting")}: ${existing.join("، ")}`);
    }
    if (missing.length > 0) {
      lines.push(`${t("report.skillsMissing")}: ${missing.join("، ")}`);
    }
    return lines.join("\n");
  }, [existing, missing, t]);

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers / non-secure contexts.
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    }
  }

  async function handleCopy() {
    const ok = await copyToClipboard(shareText);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: t("report.skillsShareTitle"), text: shareText });
        return;
      } catch {
        // User cancelled or sharing unavailable — fall through to copy.
      }
    }
    await handleCopy();
  }

  if (!hasAny) return null;

  return (
    <section aria-label={t("report.skills")}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-lg font-bold">{t("report.skills")}</h3>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleCopy} aria-live="polite">
            {copied ? (
              <Check size={16} weight="bold" className="text-success" aria-hidden />
            ) : (
              <Copy size={16} aria-hidden />
            )}
            {copied ? t("report.skillsCopied") : t("report.skillsCopy")}
          </Button>
          <Button size="sm" variant="secondary" onClick={handleShare}>
            <ShareNetwork size={16} aria-hidden />
            {t("report.skillsShare")}
          </Button>
        </div>
      </div>

      {!hasTeamData && warning && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-tint-warning px-3 py-2 text-sm text-warning-ink">
          <WarningCircle size={18} className="mt-0.5 shrink-0" weight="bold" aria-hidden />
          {warning}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {existing.length > 0 && (
          <div className="rounded-xl border border-border bg-surface-1 p-5">
            <h4 className="mb-3 font-heading text-sm font-bold text-success-ink">
              {t("report.skillsExisting")}
            </h4>
            <div className="flex flex-wrap gap-2">
              {existing.map((skill, i) => (
                <span
                  key={`${skill}-${i}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-tint-success px-3 py-1 text-sm font-medium text-success-ink"
                >
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-success" />
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {missing.length > 0 && (
          <div className="rounded-xl border border-border bg-surface-1 p-5">
            <h4 className="mb-3 font-heading text-sm font-bold text-danger-ink">
              {t("report.skillsMissing")}
            </h4>
            <div className="flex flex-wrap gap-2">
              {missing.map((skill, i) => (
                <span
                  key={`${skill}-${i}`}
                  title={t("report.skillsGapHint", {
                    gap: t(`report.gaps.${skillGapShort(skill)}.title`),
                  })}
                  className="inline-flex items-center gap-1.5 rounded-full bg-tint-danger px-3 py-1 text-sm font-medium text-danger-ink"
                >
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-danger" />
                  {skill}
                  <span className="text-xs opacity-70">
                    ← {t(`report.gaps.${skillGapShort(skill)}.title`)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * T101 — ربط كل مهارة ناقصة بالفجوة التي تسدها.
 * ترجمة منطقية من اسم المهارة إلى فئة فجوة (تقنية/سوقية/توثيق/فريق).
 * الافتراضي: فجوة الفريق (المهارة الناقصة = دور غير مغطى في الفريق).
 */
function skillGapShort(skill) {
  const s = String(skill).toLowerCase();
  if (/(market|growth|sales|business|seo|marketing)/.test(s)) return "market";
  if (/(dev|engineer|front|back|full.?stack|design|ui|ux|architect|security|data)/.test(s)) return "technical";
  if (/(writer|content|analyst|legal|finance|financial|ops|document)/.test(s)) return "documentation";
  return "team";
}

/** GAP_TO_DIMENSION is used by sibling components; keep the shared map linked. */
export { GAP_TO_DIMENSION };
