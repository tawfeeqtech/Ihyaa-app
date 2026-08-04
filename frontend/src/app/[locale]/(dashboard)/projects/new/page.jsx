"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  CheckCircle,
  CloudArrowUp,
  FloppyDisk,
  GithubLogo,
  Link as LinkIcon,
  Rocket,
  X,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Link } from "@/config/i18n/link";
import { Button } from "@/shared/components/Button";
import { useToast } from "@/shared/components/Toast";
import { sectorOptions, sectorLabels } from "@/features/projects/data/projects";
import { cn } from "@/shared/utils";

const TOTAL_STEPS = 4;
const inputClasses =
  "w-full rounded-lg border border-border bg-surface-1 px-4 py-3 text-text-primary placeholder:text-text-secondary/70 transition focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20";

const ALL_TAGS = [
  "React", "Next.js", "Python", "TensorFlow", "Laravel", "Flutter",
  "Node.js", "OpenAI", "MySQL", "AWS", "Unity", "IoT", "Embedded", "Solar",
];

const initialForm = {
  title: "",
  description: "",
  sector: "",
  tags: [],
  details: "",
  repoUrl: "",
  videoUrl: "",
  status: "needs_funding",
  budget: 100000,
  duration: "",
  visibility: "public",
  rightsConfirmed: false,
};

export default function NewProjectPage() {
  const t = useTranslations("projects");
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [published, setPublished] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function stepValid() {
    if (step === 1) return form.title.trim().length >= 4 && form.description.trim().length >= 20 && !!form.sector;
    if (step === 4) return form.rightsConfirmed;
    return true;
  }

  function handleNext() {
    if (!stepValid()) {
      toast.warning(t("wizard.incomplete"));
      return;
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function handlePublish() {
    setSubmitting(true);
    // Simulate POST /api/v1/projects + queued AI evaluation.
    window.setTimeout(() => {
      setSubmitting(false);
      setPublished(true);
      toast.success(t("wizard.published"));
    }, 900);
  }

  /* ---------- Success screen ---------- */
  if (published) {
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-tint-success"
        >
          <CheckCircle size={52} weight="light" className="text-success-ink" />
        </motion.span>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="mt-6 font-heading text-2xl font-bold sm:text-3xl">{t("wizard.successTitle")}</h1>
          <p className="mt-3 text-text-secondary">{t("wizard.successDescription")}</p>
          <p className="mt-2 rounded-lg bg-accent-100 px-4 py-3 text-sm font-medium text-primary-600">
            {t("wizard.aiQueued")}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/dashboard/owner">
              <Button size="lg">{t("wizard.goDashboard")}</Button>
            </Link>
            <Link href="/projects">
              <Button size="lg" variant="secondary">
                {t("wizard.viewGallery")}
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t("wizard.title")}</h1>
        <p className="mt-1 text-text-secondary">{t("wizard.subtitle")}</p>
      </div>

      {/* Progress stepper */}
      <ol className="flex items-center" aria-label={t("wizard.progressLabel")}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          return (
            <li key={n} className={cn("flex items-center", i < TOTAL_STEPS - 1 && "flex-1")}>
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 font-heading text-sm font-bold transition-colors",
                  done && "border-primary-600 bg-primary-600 text-white",
                  active && "border-primary-600 bg-accent-100 text-primary-600 shadow-glow",
                  !done && !active && "border-border bg-surface-1 text-text-secondary"
                )}
                aria-current={active ? "step" : undefined}
              >
                {done ? <Check size={18} weight="bold" /> : n}
              </span>
              <span
                aria-hidden
                className={cn(
                  "h-0.5 flex-1 rounded-full",
                  done || active ? "bg-primary-600" : "bg-border"
                )}
              />
            </li>
          );
        })}
      </ol>
      <p className="text-center text-sm font-semibold text-primary-600">
        {t("wizard.stepLabel", { current: step, total: TOTAL_STEPS })} — {t(`wizard.step${step}Title`)}
      </p>

      {/* Step body */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: step > 1 ? 24 : -24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: step > 1 ? -24 : 24 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="rounded-2xl border border-border bg-surface-1 p-6 shadow-sm sm:p-8"
        >
          {/* ===== Step 1: basics ===== */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label htmlFor="w-title" className="mb-1.5 block text-sm font-medium text-text-primary">
                  {t("wizard.fieldTitle")} *
                </label>
                <input
                  id="w-title"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder={t("wizard.fieldTitlePlaceholder")}
                  className={inputClasses}
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="w-desc" className="text-sm font-medium text-text-primary">
                    {t("wizard.fieldDescription")} *
                  </label>
                  <span className="text-xs text-text-secondary">{form.description.length}/500</span>
                </div>
                <textarea
                  id="w-desc"
                  rows={4}
                  maxLength={500}
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder={t("wizard.fieldDescriptionPlaceholder")}
                  className={cn(inputClasses, "resize-y")}
                />
              </div>
              <div>
                <label htmlFor="w-sector" className="mb-1.5 block text-sm font-medium text-text-primary">
                  {t("wizard.fieldSector")} *
                </label>
                <select
                  id="w-sector"
                  value={form.sector}
                  onChange={(e) => update("sector", e.target.value)}
                  className={cn(inputClasses, "appearance-none")}
                >
                  <option value="">{t("wizard.fieldSectorPlaceholder")}</option>
                  {sectorOptions.map((s) => (
                    <option key={s} value={s}>
                      {sectorLabels[s].ar} / {sectorLabels[s].en}
                    </option>
                  ))}
                </select>
              </div>
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-text-primary">
                  {t("wizard.fieldTags")}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {ALL_TAGS.map((tag) => {
                    const selected = form.tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          update(
                            "tags",
                            selected ? form.tags.filter((x) => x !== tag) : [...form.tags, tag]
                          )
                        }
                        className={cn(
                          "min-h-10 rounded-full border px-3.5 text-sm font-medium transition-all",
                          selected
                            ? "border-primary-600 bg-primary-600 text-white shadow-sm"
                            : "border-border bg-surface-0 text-text-secondary hover:border-primary-500 hover:text-text-primary"
                        )}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div>
                <label htmlFor="w-cover" className="mb-1.5 block text-sm font-medium text-text-primary">
                  {t("wizard.fieldCover")}
                </label>
                <label
                  htmlFor="w-cover"
                  className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface-0 text-text-secondary transition-colors hover:border-primary-500 hover:text-primary-600"
                >
                  <CloudArrowUp size={32} weight="light" aria-hidden />
                  <span className="text-sm font-medium">{t("wizard.coverHint")}</span>
                </label>
                <input id="w-cover" type="file" accept="image/*" className="sr-only" />
              </div>
            </div>
          )}

          {/* ===== Step 2: details & files ===== */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label htmlFor="w-details" className="mb-1.5 block text-sm font-medium text-text-primary">
                  {t("wizard.fieldDetails")}
                </label>
                <textarea
                  id="w-details"
                  rows={6}
                  value={form.details}
                  onChange={(e) => update("details", e.target.value)}
                  placeholder={t("wizard.fieldDetailsPlaceholder")}
                  className={cn(inputClasses, "resize-y")}
                />
              </div>
              <div>
                <label htmlFor="w-repo" className="mb-1.5 block text-sm font-medium text-text-primary">
                  {t("wizard.fieldRepo")}
                </label>
                <div className="relative">
                  <GithubLogo size={18} aria-hidden className="pointer-events-none absolute inset-y-0 start-4 my-auto text-text-secondary" />
                  <input
                    id="w-repo"
                    type="url"
                    dir="ltr"
                    value={form.repoUrl}
                    onChange={(e) => update("repoUrl", e.target.value)}
                    placeholder="https://github.com/..."
                    className={cn(inputClasses, "ps-11 text-start")}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="w-video" className="mb-1.5 block text-sm font-medium text-text-primary">
                  {t("wizard.fieldVideo")}
                </label>
                <div className="relative">
                  <LinkIcon size={18} aria-hidden className="pointer-events-none absolute inset-y-0 start-4 my-auto text-text-secondary" />
                  <input
                    id="w-video"
                    type="url"
                    dir="ltr"
                    value={form.videoUrl}
                    onChange={(e) => update("videoUrl", e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className={cn(inputClasses, "ps-11 text-start")}
                  />
                </div>
                <p className="mt-1.5 text-xs text-text-secondary">{t("wizard.videoHint")}</p>
              </div>
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-text-primary">{t("wizard.fieldStatus")}</legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(["completed", "needs_development", "needs_funding"]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      role="radio"
                      aria-checked={form.status === status}
                      onClick={() => update("status", status)}
                      className={cn(
                        "min-h-14 rounded-xl border px-4 text-sm font-medium transition-all",
                        form.status === status
                          ? "border-primary-600 bg-accent-100 text-primary-600 shadow-glow"
                          : "border-border bg-surface-0 text-text-secondary hover:border-primary-500"
                      )}
                    >
                      {t(`wizard.status.${status}`)}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {/* ===== Step 3: team & budget ===== */}
          {step === 3 && (
            <div className="space-y-6">
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-text-primary">{t("wizard.fieldTeam")}</legend>
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="grid gap-3 sm:grid-cols-2">
                      <input
                        aria-label={t("wizard.memberName")}
                        placeholder={`${t("wizard.memberName")} ${i + 1}`}
                        className={inputClasses}
                      />
                      <input
                        aria-label={t("wizard.memberRole")}
                        placeholder={t("wizard.memberRole")}
                        className={inputClasses}
                      />
                    </div>
                  ))}
                </div>
              </fieldset>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="w-budget" className="text-sm font-medium text-text-primary">
                    {t("wizard.fieldBudget")}
                  </label>
                  <span className="font-heading text-sm font-bold text-primary-600">
                    ${form.budget.toLocaleString("en-US")}
                  </span>
                </div>
                <input
                  id="w-budget"
                  type="range"
                  min={10000}
                  max={1000000}
                  step={10000}
                  value={form.budget}
                  onChange={(e) => update("budget", Number(e.target.value))}
                  className="w-full accent-primary-600"
                />
                <div className="flex justify-between text-xs text-text-secondary" aria-hidden>
                  <span>$10K</span>
                  <span>$1M</span>
                </div>
              </div>

              <div>
                <label htmlFor="w-duration" className="mb-1.5 block text-sm font-medium text-text-primary">
                  {t("wizard.fieldDuration")}
                </label>
                <input
                  id="w-duration"
                  value={form.duration}
                  onChange={(e) => update("duration", e.target.value)}
                  placeholder={t("wizard.fieldDurationPlaceholder")}
                  className={inputClasses}
                />
              </div>
            </div>
          )}

          {/* ===== Step 4: review & publish ===== */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-surface-0 p-5">
                <h3 className="font-heading text-lg font-bold">{form.title || t("wizard.untitled")}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-text-secondary">
                  {form.description || t("wizard.noDescription")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {form.sector && (
                    <span className="rounded-full bg-accent-100 px-3 py-1 text-xs font-semibold text-primary-600">
                      {sectorLabels[form.sector]?.ar}
                    </span>
                  )}
                  {form.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-surface-1 px-3 py-1 text-xs font-medium text-text-secondary">
                      {tag}
                    </span>
                  ))}
                </div>
                <dl className="mt-4 grid gap-2 border-t border-border pt-4 text-sm sm:grid-cols-2">
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">{t("wizard.fieldStatus")}</dt>
                    <dd className="font-medium text-text-primary">{t(`wizard.status.${form.status}`)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">{t("wizard.fieldBudget")}</dt>
                    <dd className="font-medium text-text-primary">${form.budget.toLocaleString("en-US")}</dd>
                  </div>
                </dl>
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-medium text-text-primary">{t("wizard.fieldVisibility")}</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["public", "investors_only"]).map((visibility) => (
                    <button
                      key={visibility}
                      type="button"
                      role="radio"
                      aria-checked={form.visibility === visibility}
                      onClick={() => update("visibility", visibility)}
                      className={cn(
                        "min-h-14 rounded-xl border px-4 text-sm font-medium transition-all",
                        form.visibility === visibility
                          ? "border-primary-600 bg-accent-100 text-primary-600 shadow-glow"
                          : "border-border bg-surface-0 text-text-secondary hover:border-primary-500"
                      )}
                    >
                      {t(`wizard.visibility.${visibility}`)}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl bg-surface-0 p-4 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={form.rightsConfirmed}
                  onChange={(e) => update("rightsConfirmed", e.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-border accent-primary-600"
                />
                <span>{t("wizard.rightsConfirm")}</span>
              </label>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Footer actions */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={() => toast.info(t("wizard.draftSaved"))}>
          <FloppyDisk size={18} weight="regular" />
          {t("wizard.saveDraft")}
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row">
          {step > 1 && (
            <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>
              <X size={18} className="rotate-180 rtl:rotate-0" aria-hidden />
              {t("wizard.back")}
            </Button>
          )}
          {step < TOTAL_STEPS ? (
            <Button onClick={handleNext}>{t("wizard.next")}</Button>
          ) : (
            <Button size="lg" onClick={handlePublish} loading={submitting}>
              <Rocket size={20} weight="bold" />
              {t("wizard.publish")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
