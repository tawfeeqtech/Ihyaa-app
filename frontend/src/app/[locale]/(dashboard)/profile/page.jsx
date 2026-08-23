"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Envelope, WarningCircle } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/components/Button";
import { Skeleton } from "@/shared/components/Skeleton";
import { useToast } from "@/shared/components/Toast";
import { api } from "@/shared/lib/api";
import { avatarHue, cn, initials } from "@/shared/utils";

const inputClasses =
  "w-full rounded-lg border border-border bg-surface-1 px-4 py-3 text-text-primary placeholder:text-text-secondary/70 transition focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20";

const emptyForm = {
  name: "",
  email: "",
  bio: "",
  university: "",
  major: "",
  investment_focus: "",
  investment_range: { min: "", max: "" },
  preferred_sectors: "",
};

/**
 * T137 · US-008 — الملف الشخصي.
 * يعرض ويعدّل بيانات المستخدم عبر GET/PUT /profile، ويرفع الصورة عبر
 * POST /profile/avatar (FormData). الحقول تُحدَّد حسب الدور:
 * صاحب فكرة (university, major, bio) / مستثمر (investment_focus,
 * investment_range, preferred_sectors, bio).
 */
export default function ProfilePage() {
  const t = useTranslations("profile");
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [role, setRole] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    api
      .get("/profile")
      .then((data) => {
        if (!mounted) return;
        setRole(data.role ?? "idea_owner");
        setForm({
          name: data.name ?? "",
          email: data.email ?? "",
          bio: data.bio ?? "",
          university: data.university ?? "",
          major: data.major ?? "",
          investment_focus: data.investment_focus ?? "",
          investment_range: {
            min: data.investment_range?.min ?? "",
            max: data.investment_range?.max ?? "",
          },
          preferred_sectors: Array.isArray(data.preferred_sectors)
            ? data.preferred_sectors.join(", ")
            : (data.preferred_sectors ?? ""),
        });
        setAvatarUrl(data.avatar_url ?? null);
      })
      .catch((err) => {
        toast.error(err.body?.message ?? t("loadError"));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [toast, t]);

  const isIdeaOwner = role === "idea_owner";

  // "أكمل ملفك" — البيانات الناقصة حسب الدور.
  const requiredFields = isIdeaOwner
    ? [form.university.trim(), form.major.trim(), form.bio.trim()]
    : [form.investment_focus.trim(), form.preferred_sectors.trim(), form.bio.trim()];
  const isIncomplete = role !== null && requiredFields.some((value) => value === "");

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateRange(key, value) {
    setForm((prev) => ({
      ...prev,
      investment_range: { ...prev.investment_range, [key]: value },
    }));
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const data = await api.upload("/profile/avatar", fd);
      setAvatarUrl(data.avatar_url ?? null);
      toast.success(t("avatarUploaded"));
    } catch (err) {
      toast.error(err.body?.message ?? t("avatarUploadError"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError(t("nameRequired"));
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      bio: form.bio.trim() || null,
    };

    if (isIdeaOwner) {
      payload.university = form.university.trim() || null;
      payload.major = form.major.trim() || null;
    } else {
      payload.investment_focus = form.investment_focus.trim() || null;

      // investment_range: {"min"?, "max"?} — أرسل فقط ما تم إدخاله، أو null.
      const { min, max } = form.investment_range;
      payload.investment_range =
        min === "" && max === ""
          ? null
          : {
              ...(min !== "" ? { min: Number(min) } : {}),
              ...(max !== "" ? { max: Number(max) } : {}),
            };

      const sectors = form.preferred_sectors
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      payload.preferred_sectors = sectors.length ? sectors : null;
    }

    try {
      const data = await api.put("/profile", payload);
      // أعد مزامنة الحقول التي قد يعيدها الخادم بعد التطبيع.
      setForm((prev) => ({
        ...prev,
        name: data.name ?? prev.name,
        bio: data.bio ?? prev.bio,
        university: data.university ?? prev.university,
        major: data.major ?? prev.major,
        investment_focus: data.investment_focus ?? prev.investment_focus,
        preferred_sectors: Array.isArray(data.preferred_sectors)
          ? data.preferred_sectors.join(", ")
          : prev.preferred_sectors,
      }));
      toast.success(t("saved"));
    } catch (err) {
      setError(err.body?.message ?? t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-text-secondary">{t("subtitle")}</p>
      </div>

      {/* Complete-profile banner */}
      {isIncomplete && (
        <p
          role="status"
          className="flex items-center gap-3 rounded-xl bg-tint-warning px-4 py-3 text-sm text-warning-ink"
        >
          <WarningCircle size={20} weight="bold" className="shrink-0" aria-hidden />
          <span>
            <strong className="font-heading font-semibold">{t("completeBanner")}</strong>{" "}
            {t("completeBannerDesc")}
          </span>
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Avatar */}
        <section className="rounded-2xl border border-border bg-surface-1 p-6 shadow-sm sm:p-8">
          <h2 className="font-heading text-base font-bold text-text-primary">{t("avatar")}</h2>
          <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="relative shrink-0">
              {avatarUrl ? (
                // الصورة الشخصية تأتي من الخادم (URL مطلق) — <img> مع تعطيل قاعدة next/image.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={t("avatar")}
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <span
                  aria-hidden
                  className="flex h-20 w-20 items-center justify-center rounded-full font-heading text-2xl font-bold text-white ring-2 ring-border"
                  style={{ backgroundColor: avatarHue(form.name || "?") }}
                >
                  {initials(form.name || "?")}
                </span>
              )}
              {uploading && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
                  <span
                    aria-hidden
                    className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
                  />
                </span>
              )}
            </div>
            <div>
              <input
                ref={fileRef}
                id="profile-avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleAvatarChange}
              />
              <label
                htmlFor="profile-avatar"
                className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface-0 px-4 text-sm font-semibold text-text-primary transition-colors hover:bg-accent-100"
              >
                <Camera size={18} weight="bold" aria-hidden />
                {t("changePhoto")}
              </label>
              <p className="mt-1.5 text-xs text-text-secondary">{t("avatarHint")}</p>
            </div>
          </div>
        </section>

        {/* Basic info */}
        <section className="rounded-2xl border border-border bg-surface-1 p-6 shadow-sm sm:p-8">
          <h2 className="font-heading text-base font-bold text-text-primary">{t("title")}</h2>
          <div className="mt-4 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="p-name" className="mb-1.5 block text-sm font-medium text-text-primary">
                  {t("name")} *
                </label>
                <input
                  id="p-name"
                  type="text"
                  autoComplete="name"
                  required
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder={t("namePlaceholder")}
                  className={inputClasses}
                />
              </div>
              <div>
                <label htmlFor="p-email" className="mb-1.5 block text-sm font-medium text-text-primary">
                  {t("email")}
                </label>
                <div className="relative">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4 text-text-secondary"
                  >
                    <Envelope size={18} />
                  </span>
                  <input
                    id="p-email"
                    type="email"
                    value={form.email}
                    readOnly
                    disabled
                    className={cn(inputClasses, "cursor-not-allowed bg-surface-0 ps-11 text-text-secondary")}
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="p-bio" className="mb-1.5 block text-sm font-medium text-text-primary">
                {t("bio")} *
              </label>
              <textarea
                id="p-bio"
                rows={4}
                maxLength={1000}
                value={form.bio}
                onChange={(e) => update("bio", e.target.value)}
                placeholder={t("bioPlaceholder")}
                className={cn(inputClasses, "resize-y")}
              />
            </div>
          </div>
        </section>

        {/* Role-specific fields */}
        <section className="rounded-2xl border border-border bg-surface-1 p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-heading text-base font-bold text-text-primary">
              {isIdeaOwner ? t("roleOwner") : t("roleInvestor")}
            </h2>
            <span className="rounded-full bg-accent-100 px-3 py-1 text-xs font-semibold text-primary-600">
              {isIdeaOwner ? t("roleOwner") : t("roleInvestor")}
            </span>
          </div>

          {isIdeaOwner ? (
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="p-university" className="mb-1.5 block text-sm font-medium text-text-primary">
                  {t("university")} *
                </label>
                <input
                  id="p-university"
                  type="text"
                  value={form.university}
                  onChange={(e) => update("university", e.target.value)}
                  placeholder={t("universityPlaceholder")}
                  className={inputClasses}
                />
              </div>
              <div>
                <label htmlFor="p-major" className="mb-1.5 block text-sm font-medium text-text-primary">
                  {t("major")} *
                </label>
                <input
                  id="p-major"
                  type="text"
                  value={form.major}
                  onChange={(e) => update("major", e.target.value)}
                  placeholder={t("majorPlaceholder")}
                  className={inputClasses}
                />
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-5">
              <div>
                <label htmlFor="p-focus" className="mb-1.5 block text-sm font-medium text-text-primary">
                  {t("investmentFocus")} *
                </label>
                <input
                  id="p-focus"
                  type="text"
                  value={form.investment_focus}
                  onChange={(e) => update("investment_focus", e.target.value)}
                  placeholder={t("investmentFocusPlaceholder")}
                  className={inputClasses}
                />
              </div>

              <div>
                <span className="mb-1.5 block text-sm font-medium text-text-primary">{t("investmentRange")}</span>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="p-range-min" className="mb-1.5 block text-xs font-medium text-text-secondary">
                      {t("investmentRangeMin")}
                    </label>
                    <input
                      id="p-range-min"
                      type="number"
                      min={0}
                      value={form.investment_range.min}
                      onChange={(e) => updateRange("min", e.target.value)}
                      placeholder="0"
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label htmlFor="p-range-max" className="mb-1.5 block text-xs font-medium text-text-secondary">
                      {t("investmentRangeMax")}
                    </label>
                    <input
                      id="p-range-max"
                      type="number"
                      min={0}
                      value={form.investment_range.max}
                      onChange={(e) => updateRange("max", e.target.value)}
                      placeholder="0"
                      className={inputClasses}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="p-sectors" className="mb-1.5 block text-sm font-medium text-text-primary">
                  {t("preferredSectors")} *
                </label>
                <input
                  id="p-sectors"
                  type="text"
                  value={form.preferred_sectors}
                  onChange={(e) => update("preferred_sectors", e.target.value)}
                  placeholder={t("preferredSectorsPlaceholder")}
                  className={inputClasses}
                />
                <p className="mt-1.5 text-xs text-text-secondary">{t("preferredSectorsHint")}</p>
              </div>
            </div>
          )}
        </section>

        {error && (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-lg bg-tint-danger px-4 py-3 text-sm text-danger-ink"
          >
            <WarningCircle size={18} weight="bold" aria-hidden />
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <Button type="submit" size="lg" loading={saving}>
            {saving ? t("saving") : t("save")}
          </Button>
        </div>
      </form>
    </div>
  );
}

/** Loading skeleton for the profile page. */
function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="rounded-2xl border border-border bg-surface-1 p-6 shadow-sm sm:p-8">
        <Skeleton className="h-5 w-32" />
        <div className="mt-4 flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <Skeleton className="h-12 w-32" />
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-surface-1 p-6 shadow-sm sm:p-8">
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
