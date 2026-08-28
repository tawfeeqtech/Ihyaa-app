"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  FileX,
  FloppyDisk,
  GithubLogo,
  Link as LinkIcon,
  Plus,
  Rocket,
  Tag,
  X,
} from "@phosphor-icons/react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/config/i18n/link";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { Skeleton } from "@/shared/components/Skeleton";
import { useToast } from "@/shared/components/Toast";
import { api } from "@/shared/lib/api";
import { RequireVerifiedEmail } from "@/features/auth/utils/guards";
import { ReevaluationAlert } from "@/features/projects/components/ReevaluationAlert";
import { cn } from "@/shared/utils";

const inputClasses =
  "w-full rounded-lg border border-border bg-surface-1 px-4 py-3 text-text-primary placeholder:text-text-secondary/70 transition focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20";

// وسوم تقنية مقترحة افتراضياً (تُدمج مع اقتراحات الخادم) — قابلة للإضافة/الحذف، وليست حصرية.
const SUGGESTED_TAGS = [
  "React", "Next.js", "Python", "TensorFlow", "Laravel", "Flutter",
  "Node.js", "OpenAI", "MySQL", "AWS", "Unity", "IoT", "Embedded", "Solar",
];

const emptyForm = {
  title: "",
  description: "",
  categoryId: "",
  tags: [],
  status: "needs_funding",
  repoUrl: "",
  videoUrl: "",
  budgetMin: "",
  budgetMax: "",
  visibility: "public",
  team: [{ name: "", role: "" }],
};

/**
 * صفحة استكمال/تعديل مشروع — دورة "حفظ كمسودة ← عرض ← استكمال".
 * نموذج صفحة واحدة (وليس معالج 4 خطوات) معبّأ مسبقاً من GET /projects/{id}.
 * الزرّان يرسلان PUT /projects/{id} مع publication_status مختلف.
 * ملاحظة: validateProject في الـ backend يفرض الحقول required حتى في التحديث
 * (title, description 50–2000, category_id, status) لذا نرسل النموذج كاملاً دائماً.
 */
export default function EditProjectPage() {
  const t = useTranslations("projects");
  const toast = useToast();
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(null); // "draft" | "published" | null
  const [saved, setSaved] = useState(null); // شاشة النجاح بعد الحفظ/النشر
  // T081: إعادة التقييم المقترحة عند تغيير بيانات جوهرية (significant_changes).
  const [reevalOpen, setReevalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState(SUGGESTED_TAGS);

  // الاقتراحات الأساسية (ثابتة + الأكثر شعبية من الخادم) — تُعرض عندما يكون الحقل فارغاً.
  const baseTagsRef = useRef(SUGGESTED_TAGS);

  useEffect(() => {
    let cancelled = false;

    // T147: اقتراحات الوسوم ديناميكية — عند الكتابة debounce 300ms ثم fetch
    // GET /tags/suggestions?q=<input>. وعند إفراغ الحقل تُستعاد الاقتراحات الأساسية.
    api.get("/tags/suggestions")
      .then((res) => {
        const server = res?.suggestions ?? [];
        const merged = [...new Set([...SUGGESTED_TAGS, ...server])];
        baseTagsRef.current = merged;
        if (!cancelled) setTagSuggestions(merged);
      })
      .catch(() => {});

    async function load() {
      try {
        const cats = await api.get("/categories").catch(() => []);
        const proj = await api.get(`/projects/${id}`);
        if (cancelled) return;

        const list = Array.isArray(cats) ? cats : [];
        setCategories(list);
        const category = list.find((c) => c.slug === proj.category?.slug);

        setForm({
          title: proj.title ?? "",
          description: proj.description ?? "",
          categoryId: category ? String(category.id) : "",
          tags: Array.isArray(proj.tags) ? proj.tags : [],
          status: proj.state ?? proj.status ?? "needs_funding",
          repoUrl: proj.github_url ?? "",
          videoUrl: proj.video?.url ?? "",
          budgetMin: proj.budget?.min != null ? String(proj.budget.min) : "",
          budgetMax: proj.budget?.max != null ? String(proj.budget.max) : "",
          visibility: proj.stored_visibility_level === 2 ? "investors_only" : "public",
          team:
            Array.isArray(proj.team) && proj.team.length
              ? proj.team.map((m) => ({ name: m.name ?? "", role: m.role ?? "" }))
              : [{ name: "", role: "" }],
        });
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // T147: عند الكتابة في حقل الوسوم — debounce 300ms ثم GET /tags/suggestions?q=<input>.
  useEffect(() => {
    const q = tagInput.trim();
    if (!q) return; // أُفرغ الحقل → الاستعادة تتم في onChange (setTagSuggestions(baseTagsRef.current))

    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const res = await api.get(`/tags/suggestions?q=${encodeURIComponent(q)}`);
        const server = res?.suggestions ?? [];
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

  function buildPayload(publicationStatus) {
    const videoUrl = form.videoUrl.trim();
    const videoProvider = videoUrl ? (/vimeo/i.test(videoUrl) ? "vimeo" : "youtube") : null;

    const team = form.team
      .map((m) => ({ name: m.name.trim(), role: m.role.trim() }))
      .filter((m) => m.name !== "");

    return {
      title: form.title.trim(),
      description: form.description.trim(),
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

  function validate() {
    const errs = [];
    if (form.title.trim().length < 5) errs.push(t("edit.errorTitle"));
    const descLen = form.description.trim().length;
    if (descLen < 50) errs.push(t("edit.errorDescription"));
    if (descLen > 2000) errs.push(t("edit.errorDescriptionMax"));
    if (!form.categoryId) errs.push(t("wizard.errorSector"));
    return errs;
  }

  async function handleSave(publicationStatus) {
    const errs = validate();
    if (errs.length > 0) {
      toast.warning(errs.join(" • "));
      return;
    }
    setSaving(publicationStatus);
    try {
      const res = await api.put(`/projects/${id}`, buildPayload(publicationStatus));
      setSaved(publicationStatus);
      toast.success(
        publicationStatus === "draft" ? t("edit.draftSaved") : t("edit.published")
      );
      // T081: بيانات جوهرية تغيّرت (SRS-AI-C02) → اعرض اقتراح إعادة التقييم.
      if (res?.significant_changes) setReevalOpen(true);
    } catch (err) {
      const body = err.body;
      const msg =
        body?.message ??
        (body?.errors ? Object.values(body.errors).flat().join(". ") : t("edit.saveError"));
      toast.error(msg);
    } finally {
      setSaving(null);
    }
  }

  const selectedCategory = categories.find((c) => String(c.id) === String(form.categoryId));

  /* ---------- Success screen ---------- */
  if (saved) {
    const isDraft = saved === "draft";
    const titleKey = isDraft ? "edit.draftSuccessTitle" : "edit.publishedSuccessTitle";
    const descKey = isDraft ? "edit.draftSuccessDescription" : "edit.publishedSuccessDescription";
    return (
      <>
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
            <h1 className="mt-6 font-heading text-2xl font-bold sm:text-3xl">{t(titleKey)}</h1>
            <p className="mt-3 text-text-secondary">{t(descKey)}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/dashboard/owner">
                <Button size="lg">{t("edit.backToDashboard")}</Button>
              </Link>
              <Link href={`/projects/${id}`}>
                <Button variant="secondary" size="lg">{t("edit.viewProject")}</Button>
              </Link>
            </div>
          </motion.div>
        </div>
        {/* T081 · SRS-AI-C02: تغيّرت بيانات جوهرية → اقتراح إعادة التقييم */}
        <ReevaluationAlert
          open={reevalOpen}
          projectId={id}
          onClose={() => setReevalOpen(false)}
          onQueued={() => router.push(`/projects/${id}`)}
        />
      </>
    );
  }

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        <div className="rounded-2xl border border-border bg-surface-1 p-6 shadow-sm sm:p-8">
          <div className="space-y-5">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Not found / no access ---------- */
  if (notFound) {
    return (
      <EmptyState
        icon={FileX}
        title={t("edit.notFoundTitle")}
        description={t("edit.notFoundDescription")}
        action={
          <Link href="/dashboard/owner">
            <Button variant="secondary">{t("edit.backToDashboard")}</Button>
          </Link>
        }
      />
    );
  }

  return (
    <RequireVerifiedEmail>
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t("edit.title")}</h1>
        <p className="mt-1 text-text-secondary">{t("edit.subtitle")}</p>
      </div>

      <div className="rounded-2xl border border-border bg-surface-1 p-6 shadow-sm sm:p-8">
        <div className="space-y-6">
          {/* ===== Basics ===== */}
          <div>
            <label htmlFor="e-title" className="mb-1.5 block text-sm font-medium text-text-primary">
              {t("wizard.fieldTitle")} *
            </label>
            <input
              id="e-title"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder={t("wizard.fieldTitlePlaceholder")}
              className={inputClasses}
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="e-desc" className="text-sm font-medium text-text-primary">
                {t("edit.fieldDescription")} *
              </label>
              <span
                className={cn(
                  "text-xs",
                  form.description.trim().length < 50 || form.description.trim().length > 2000
                    ? "text-danger"
                    : "text-text-secondary"
                )}
              >
                {form.description.length}/2000 · {t("edit.descriptionMinHint")}
              </span>
            </div>
            <textarea
              id="e-desc"
              rows={7}
              maxLength={2000}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder={t("edit.fieldDescriptionPlaceholder")}
              className={cn(inputClasses, "resize-y")}
            />
          </div>

          <div>
            <label htmlFor="e-sector" className="mb-1.5 block text-sm font-medium text-text-primary">
              {t("wizard.fieldSector")} *
            </label>
            <select
              id="e-sector"
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
                {selectedCategory.name_ar} / {selectedCategory.name_en}
              </p>
            )}
          </div>

          {/* ===== Status ===== */}
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

          {/* ===== Tags ===== */}
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
                    className="inline-flex min-h-12 items-center gap-1.5 rounded-full border border-primary-600 bg-primary-600 px-3.5 text-sm font-medium text-on-primary"
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
                    "inline-flex min-h-12 items-center justify-center rounded-full border px-3.5 text-sm font-medium transition-all",
                    form.tags.includes(tag)
                      ? "border-primary-600 bg-primary-600 text-on-primary shadow-sm"
                      : "border-border bg-surface-0 text-text-secondary hover:border-primary-500 hover:text-text-primary"
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </fieldset>

          {/* ===== Links ===== */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="e-repo" className="mb-1.5 block text-sm font-medium text-text-primary">
                {t("wizard.fieldRepo")}
              </label>
              <div className="relative">
                <GithubLogo size={18} aria-hidden className="pointer-events-none absolute inset-y-0 start-4 my-auto text-text-secondary" />
                <input
                  id="e-repo"
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
              <label htmlFor="e-video" className="mb-1.5 block text-sm font-medium text-text-primary">
                {t("wizard.fieldVideo")}
              </label>
              <div className="relative">
                <LinkIcon size={18} aria-hidden className="pointer-events-none absolute inset-y-0 start-4 my-auto text-text-secondary" />
                <input
                  id="e-video"
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
          </div>

          {/* ===== Team ===== */}
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
              className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-lg px-3 text-sm font-medium text-primary-600 transition-colors hover:bg-accent-100"
            >
              <Plus size={16} weight="bold" aria-hidden />
              {t("wizard.addMember")}
            </button>
          </fieldset>

          {/* ===== Budget ===== */}
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-text-primary">{t("wizard.fieldBudget")}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="e-budget-min" className="mb-1.5 block text-xs font-medium text-text-secondary">
                  {t("wizard.fieldBudgetMin")}
                </label>
                <input
                  id="e-budget-min"
                  type="number"
                  min={0}
                  value={form.budgetMin}
                  onChange={(e) => update("budgetMin", e.target.value)}
                  placeholder="0"
                  className={inputClasses}
                />
              </div>
              <div>
                <label htmlFor="e-budget-max" className="mb-1.5 block text-xs font-medium text-text-secondary">
                  {t("wizard.fieldBudgetMax")}
                </label>
                <input
                  id="e-budget-max"
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

          {/* ===== Visibility ===== */}
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
        </div>
      </div>

      {/* Footer actions: حفظ كمسودة / نشر */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button variant="secondary" onClick={() => handleSave("draft")} loading={saving === "draft"}>
          <FloppyDisk size={18} weight="regular" />
          {t("edit.saveDraft")}
        </Button>
        <Button size="lg" onClick={() => handleSave("published")} loading={saving === "published"}>
          <Rocket size={20} weight="bold" />
          {t("edit.publish")}
        </Button>
      </div>
    </div>
    </RequireVerifiedEmail>
  );
}
