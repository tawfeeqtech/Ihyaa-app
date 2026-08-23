"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  CheckCircle,
  CloudArrowUp,
  FloppyDisk,
  GithubLogo,
  Link as LinkIcon,
  Plus,
  Rocket,
  Tag,
  X,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Link } from "@/config/i18n/link";
import { Button } from "@/shared/components/Button";
import { useToast } from "@/shared/components/Toast";
import { api } from "@/shared/lib/api";
import { RequireVerifiedEmail } from "@/features/auth/utils/guards";
import { cn } from "@/shared/utils";

const TOTAL_STEPS = 4;
const inputClasses =
  "w-full rounded-lg border border-border bg-surface-1 px-4 py-3 text-text-primary placeholder:text-text-secondary/70 transition focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20";

// وسوم تقنية مقترحة افتراضياً (تُدمج مع اقتراحات الخادم) — قابلة للإضافة/الحذف، وليست حصرية.
const SUGGESTED_TAGS = [
  "React", "Next.js", "Python", "TensorFlow", "Laravel", "Flutter",
  "Node.js", "OpenAI", "MySQL", "AWS", "Unity", "IoT", "Embedded", "Solar",
];

// أمثلة إرشادية لكل قطاع — تساعد صاحب الفكرة على اختيار التصنيف الأقرب.
const SECTOR_HINTS = {
  fintech: "مدفوعات، تمويل، بنوك، تأمين، عملات رقمية",
  healthtech: "رعاية صحية، أجهزة طبية، مواعيد، صحة نفسية",
  edtech: "تعليم، تدريب، منصات تعلّم، مهارات",
  ecommerce: "بيع وشراء منتجات، متاجر إلكترونية",
  saas: "برمجيات باشتراك شهري للشركات أو الأفراد",
  ai: "ذكاء اصطناعي، تعلّم آلة، معالجة لغة طبيعية",
  agritech: "زراعة ذكية، ري، إنتاج غذائي",
  logistics: "شحن، توصيل، سلاسل إمداد، مخازن",
  real_estate: "عقارات، إدارة أملاك، تمويل عقاري",
  energy: "طاقة، متجددة، كفاءة استهلاك",
  gaming: "ألعاب، ترفيه رقمي، محاكاة",
  social: "تواصل اجتماعي، مجتمعات، محتوى",
  marketplace: "سوق يجمع بائعين ومشترين، خدمات وسيطة",
  tourism: "سياحة، حجوزات، تجارب سفر",
  other: "لا يندرج ضمن أي تصنيف أعلاه",
};

const initialForm = {
  title: "",
  description: "",
  categoryId: "",
  tags: [],
  details: "",
  repoUrl: "",
  videoUrl: "",
  status: "needs_funding",
  budgetMin: "",
  budgetMax: "",
  visibility: "public",
  rightsConfirmed: false,
  team: [{ name: "", role: "" }],
  coverFile: null,
};

export default function NewProjectPage() {
  const t = useTranslations("projects");
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [categories, setCategories] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState(SUGGESTED_TAGS);
  const [saveResult, setSaveResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // الاقتراحات الأساسية (ثابتة + الأكثر شعبية من الخادم) — تُعرض عندما يكون الحقل فارغاً.
  const baseTagsRef = useRef(SUGGESTED_TAGS);

  useEffect(() => {
    api.get("/categories")
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  // T147: اقتراحات الوسوم ديناميكية — عند الكتابة debounce 300ms ثم fetch
  // GET /tags/suggestions?q=<input>. وعند إفراغ الحقل تُستعاد الاقتراحات الأساسية.
  useEffect(() => {
    let active = true;
    api.get("/tags/suggestions")
      .then((res) => {
        const server = res?.suggestions ?? [];
        const merged = [...new Set([...SUGGESTED_TAGS, ...server])];
        baseTagsRef.current = merged;
        if (active) setTagSuggestions(merged);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const q = tagInput.trim();
    if (!q) return; // أُفرغ الحقل → الاستعادة تتم في onChange (setTagSuggestions(baseTagsRef.current))

    const timer = window.setTimeout(async () => {
      try {
        const res = await api.get(`/tags/suggestions?q=${encodeURIComponent(q)}`);
        const server = res?.suggestions ?? [];
        // ادمج الاقتراحات المحلية المطابقة مع نتائج الخادم لعرضها كأزرار مفيدة.
        const local = baseTagsRef.current.filter((tag) =>
          tag.toLowerCase().includes(q.toLowerCase())
        );
        if (active) setTagSuggestions([...new Set([...local, ...server])].slice(0, 10));
      } catch {
        if (active) {
          setTagSuggestions(
            baseTagsRef.current.filter((tag) => tag.toLowerCase().includes(q.toLowerCase()))
          );
        }
      }
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [tagInput]);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateTeam(index, field, value) {
    setForm((prev) => {
      const team = prev.team.map((m, i) => (i === index ? { ...m, [field]: value } : m));
      return { ...prev, team };
    });
  }

  function addMember() {
    setForm((prev) => ({ ...prev, team: [...prev.team, { name: "", role: "" }] }));
  }

  function removeMember(index) {
    setForm((prev) => ({
      ...prev,
      team: prev.team.length > 1 ? prev.team.filter((_, i) => i !== index) : prev.team,
    }));
  }

  function addTag(raw) {
    const tag = (raw ?? "").trim();
    if (!tag) return;
    setForm((prev) => {
      if (prev.tags.includes(tag)) return prev;
      if (prev.tags.length >= 10) {
        toast.warning(t("wizard.tagHint"));
        return prev;
      }
      return { ...prev, tags: [...prev.tags, tag] };
    });
    setTagInput("");
  }

  function removeTag(tag) {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((x) => x !== tag) }));
  }

  function handleTagKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    }
  }

  function stepValid() {
    if (step === 1)
      return form.title.trim().length >= 4 && form.description.trim().length >= 20 && !!form.categoryId;
    if (step === 4) return form.rightsConfirmed;
    return true;
  }

  // إرجاع رسائل محددة للحقول الناقصة في الخطوة 1 (بدلاً من رسالة عامة).
  function stepErrors() {
    const errs = [];
    if (form.title.trim().length < 4) errs.push(t("wizard.errorTitle"));
    if (form.description.trim().length < 20) errs.push(t("wizard.errorDescription"));
    if (!form.categoryId) errs.push(t("wizard.errorSector"));
    return errs;
  }

  function handleNext() {
    if (step === 1) {
      const errs = stepErrors();
      if (errs.length > 0) {
        toast.warning(errs.join(" • "));
        return;
      }
    } else if (!stepValid()) {
      toast.warning(t("wizard.incomplete"));
      return;
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function buildPayload(publicationStatus) {
    // Backend requires 50–2000 chars — combine short + detailed descriptions.
    const description = [form.description.trim(), form.details.trim()].filter(Boolean).join("\n\n");
    const videoUrl = form.videoUrl.trim();
    const videoProvider = videoUrl ? (/vimeo/i.test(videoUrl) ? "vimeo" : "youtube") : null;

    const team = form.team
      .map((m) => ({ name: m.name.trim(), role: m.role.trim() }))
      .filter((m) => m.name !== "");

    return {
      title: form.title.trim(),
      description,
      category_id: Number(form.categoryId),
      status: form.status,
      publication_status: publicationStatus,
      tags: form.tags,
      team: team.length ? team : null,
      github_url: form.repoUrl.trim() || null,
      video_url: videoUrl || null,
      ...(videoProvider ? { video_provider: videoProvider } : {}),
      budget_min: form.budgetMin === "" ? null : Number(form.budgetMin),
      budget_max: form.budgetMax === "" ? null : Number(form.budgetMax),
      visibility_level: form.visibility === "public" ? 1 : 2,
    };
  }

  async function handlePublish() {
    if (!stepValid()) {
      toast.warning(t("wizard.incomplete"));
      return;
    }
    setSubmitting(true);
    try {
      const created = await api.post("/projects", buildPayload("published"));

      // صورة الغلاف تُرفع عبر نقطة الملفات (بعد وجود المشروع).
      if (form.coverFile) {
        const fd = new FormData();
        fd.append("images[]", form.coverFile);
        try {
          await api.upload(`/projects/${created.id}/files`, fd);
        } catch {
          // الغلاف اختياري — لا نمنع النشر إذا فشل الرفع.
        }
      }

      setSaveResult("published");
      toast.success(t("wizard.published"));
    } catch (err) {
      const body = err.body;
      const msg =
        body?.message ??
        (body?.errors ? Object.values(body.errors).flat().join(". ") : t("wizard.publishError"));
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveDraft() {
    const description = [form.description.trim(), form.details.trim()].filter(Boolean).join("\n\n");
    if (form.title.trim().length < 5 || description.length < 50 || !form.categoryId) {
      toast.warning(t("wizard.incomplete"));
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/projects", buildPayload("draft"));
      setSaveResult("draft");
      toast.success(t("wizard.draftSaved"));
    } catch (err) {
      const body = err.body;
      const msg =
        body?.message ??
        (body?.errors ? Object.values(body.errors).flat().join(". ") : t("wizard.publishError"));
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const selectedCategory = categories.find((c) => String(c.id) === String(form.categoryId));

  /* ---------- Success screen ---------- */
  if (saveResult) {
    const isDraft = saveResult === "draft";
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
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h1 className="mt-6 font-heading text-2xl font-bold sm:text-3xl">
            {isDraft ? t("wizard.draftSavedTitle") : t("wizard.successTitle")}
          </h1>
          <p className="mt-3 text-text-secondary">
            {isDraft ? t("wizard.draftSavedDescription") : t("wizard.successDescription")}
          </p>
          {!isDraft && (
            <p className="mt-2 rounded-lg bg-accent-100 px-4 py-3 text-sm font-medium text-primary-600">
              {t("wizard.aiQueued")}
            </p>
          )}
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/dashboard/owner">
              <Button size="lg">{t("wizard.goDashboard")}</Button>
            </Link>
            {!isDraft && (
              <Link href="/projects">
                <Button size="lg" variant="secondary">
                  {t("wizard.viewGallery")}
                </Button>
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <RequireVerifiedEmail>
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
                className={cn("h-0.5 flex-1 rounded-full", done || active ? "bg-primary-600" : "bg-border")}
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
                  <span
                    className={cn(
                      "text-xs",
                      form.description.trim().length < 20 ? "text-danger" : "text-text-secondary"
                    )}
                  >
                    {form.description.length}/500 · {t("wizard.descriptionMinHint")}
                  </span>
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
                  value={form.categoryId}
                  onChange={(e) => update("categoryId", e.target.value)}
                  className={cn(inputClasses, "appearance-none")}
                >
                  <option value="">{t("wizard.fieldSectorPlaceholder")}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_ar} / {c.name_en}
                    </option>
                  ))}
                </select>
                {selectedCategory && (
                  <p className="mt-1.5 text-xs text-text-secondary">
                    {t("wizard.sectorHint")}: {SECTOR_HINTS[selectedCategory.slug] ?? ""}
                  </p>
                )}
              </div>
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-text-primary">{t("wizard.fieldTags")}</legend>
                <div className="mb-2 flex items-center gap-2">
                  <Tag size={18} aria-hidden className="shrink-0 text-text-secondary" />
                  <input
                    value={tagInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTagInput(val);
                      if (!val.trim()) setTagSuggestions(baseTagsRef.current);
                    }}
                    onKeyDown={handleTagKeyDown}
                    onBlur={() => addTag(tagInput)}
                    placeholder={t("wizard.tagPlaceholder")}
                    className={inputClasses}
                  />
                </div>
                {form.tags.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {form.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-primary-600 bg-primary-600 px-3.5 text-sm font-medium text-white"
                      >
                        {tag}
                        <X size={14} weight="bold" aria-hidden />
                      </button>
                    ))}
                  </div>
                )}
                <p className="mb-2 text-xs text-text-secondary">{t("wizard.tagHint")}</p>
                <div className="flex flex-wrap gap-2">
                  {tagSuggestions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={form.tags.includes(tag)}
                      onClick={() => addTag(tag)}
                      className={cn(
                        "min-h-10 rounded-full border px-3.5 text-sm font-medium transition-all",
                        form.tags.includes(tag)
                          ? "border-primary-600 bg-primary-600 text-white shadow-sm"
                          : "border-border bg-surface-0 text-text-secondary hover:border-primary-500 hover:text-text-primary"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
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
                  <span className="text-sm font-medium">
                    {form.coverFile ? form.coverFile.name : t("wizard.coverHint")}
                  </span>
                  {form.coverFile && (
                    <span className="rounded-full bg-tint-success px-3 py-1 text-xs font-semibold text-success-ink">
                      {t("wizard.coverSelected")}
                    </span>
                  )}
                </label>
                <input
                  id="w-cover"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => update("coverFile", e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          )}

          {/* ===== Step 2: details & links ===== */}
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
                  {form.team.map((member, i) => (
                    <div key={i} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
                      <input
                        aria-label={`${t("wizard.memberName")} ${i + 1}`}
                        value={member.name}
                        onChange={(e) => updateTeam(i, "name", e.target.value)}
                        placeholder={t("wizard.memberName")}
                        className={inputClasses}
                      />
                      <input
                        aria-label={t("wizard.memberRole")}
                        value={member.role}
                        onChange={(e) => updateTeam(i, "role", e.target.value)}
                        placeholder={t("wizard.memberRole")}
                        className={inputClasses}
                      />
                      <button
                        type="button"
                        onClick={() => removeMember(i)}
                        disabled={form.team.length === 1}
                        aria-label={t("wizard.removeMember")}
                        className="inline-flex min-h-12 w-12 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-tint-danger hover:text-danger disabled:opacity-40"
                      >
                        <X size={18} aria-hidden />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addMember}
                  className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-primary-600 transition-colors hover:bg-accent-100"
                >
                  <Plus size={16} weight="bold" aria-hidden />
                  {t("wizard.addMember")}
                </button>
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-sm font-medium text-text-primary">{t("wizard.fieldBudget")}</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="w-budget-min" className="mb-1.5 block text-xs font-medium text-text-secondary">
                      {t("wizard.fieldBudgetMin")}
                    </label>
                    <input
                      id="w-budget-min"
                      type="number"
                      min={0}
                      value={form.budgetMin}
                      onChange={(e) => update("budgetMin", e.target.value)}
                      placeholder="0"
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label htmlFor="w-budget-max" className="mb-1.5 block text-xs font-medium text-text-secondary">
                      {t("wizard.fieldBudgetMax")}
                    </label>
                    <input
                      id="w-budget-max"
                      type="number"
                      min={0}
                      value={form.budgetMax}
                      onChange={(e) => update("budgetMax", e.target.value)}
                      placeholder="0"
                      className={inputClasses}
                    />
                  </div>
                </div>
              </fieldset>
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
                  {selectedCategory && (
                    <span className="rounded-full bg-accent-100 px-3 py-1 text-xs font-semibold text-primary-600">
                      {selectedCategory.name_ar}
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
                    <dd className="font-medium text-text-primary">
                      {form.budgetMin || form.budgetMax
                        ? `${form.budgetMin || "?"} – ${form.budgetMax || "?"}`
                        : "—"}
                    </dd>
                  </div>
                  {form.team.some((m) => m.name.trim()) && (
                    <div className="flex justify-between sm:col-span-2">
                      <dt className="text-text-secondary">{t("wizard.fieldTeam")}</dt>
                      <dd className="text-end font-medium text-text-primary">
                        {form.team.filter((m) => m.name.trim()).length} {t("wizard.memberName")}
                      </dd>
                    </div>
                  )}
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
        <Button variant="ghost" onClick={handleSaveDraft} loading={submitting}>
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
    </RequireVerifiedEmail>
  );
}
