"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ChartDonut,
  ChartLineUp,
  CloudArrowUp,
  MagnifyingGlass,
  Money,
  Quotes,
  Robot,
} from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { Header } from "@/shared/layout/Header";
import { Footer } from "@/shared/layout/Footer";
import { Button } from "@/shared/components/Button";
import { AIScoreBadge } from "@/features/projects/components/AIScoreBadge";
import { ScoreRing } from "@/features/projects/components/ScoreRing";
import { Link } from "@/config/i18n/link";
import { useToast } from "@/shared/components/Toast";
import { cn, formatNumber } from "@/shared/utils";

const EASE = { duration: 0.5, ease: "easeOut" };

/* ---------- Animated counter (respects prefers-reduced-motion via framer) ---------- */
function AnimatedCounter({ target, suffix = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const duration = 1200;
    let raf = 0;
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {formatNumber(value)}
      {suffix}
    </span>
  );
}

/* ---------- Landing page ---------- */
export default function LandingPage() {
  const t = useTranslations("landing");
  const locale = useLocale();
  const toast = useToast();
  const [email, setEmail] = useState("");

  const steps = [
    { icon: CloudArrowUp, key: "upload" },
    { icon: Robot, key: "ai" },
    { icon: ChartDonut, key: "report" },
    { icon: Money, key: "connect" },
  ];

  const dimensions = [
    { key: "technical", score: 90 },
    { key: "innovation", score: 84 },
    { key: "market", score: 76 },
    { key: "team", score: 88 },
    { key: "documentation", score: 70 },
  ];

  const testimonials = ["t1", "t2", "t3"];

  function handleCtaSubmit(e) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.warning(t("ctaEmailInvalid"));
      return;
    }
    toast.success(t("ctaSuccess"));
    setEmail("");
  }

  const ArrowComponent = locale === "ar" ? ArrowLeft : ArrowRight;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main>
        {/* ============ Hero ============ */}
        <section className="relative overflow-hidden bg-primary-600 pattern-islamic">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-28">
            {/* Copy — first in DOM = start side (right in RTL) */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={EASE}
              className="text-on-primary"
            >
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-on-primary/90">
                <ChartLineUp size={18} weight="bold" aria-hidden />
                {t("hero.badge")}
              </p>
              <h1 className="mt-6 font-heading text-4xl font-bold leading-tight text-on-primary drop-shadow-sm sm:text-5xl lg:text-6xl">
                {t("hero.title")}
              </h1>
              <p className="mt-6 max-w-lg text-lg text-on-primary/85">{t("hero.subtitle")}</p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/projects/new">
                  <Button variant="outlineLight" size="lg" fullWidth>
                    {t("hero.ctaUpload")}
                    <ArrowComponent size={20} weight="bold" aria-hidden />
                  </Button>
                </Link>
                <Link href="/projects">
                  <Button
                    size="lg"
                    fullWidth
                    className="border border-transparent bg-white text-primary-600 shadow-lg hover:bg-white/90"
                  >
                    {t("hero.ctaExplore")}
                  </Button>
                </Link>
              </div>

              {/* Live stats */}
              <dl className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-on-primary/20 pt-8">
                {(
                  [
                    { value: 2450, suffix: "+", key: "projects" },
                    { value: 890, suffix: "+", key: "investors" },
                    { value: 120, suffix: "+", key: "deals" },
                  ]
                ).map((stat) => (
                  <div key={stat.key}>
                    <dt className="text-sm text-on-primary/75">{t(`hero.stats.${stat.key}`)}</dt>
                    <dd className="font-heading text-2xl font-bold text-on-primary sm:text-3xl">
                      <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                    </dd>
                  </div>
                ))}
              </dl>
            </motion.div>

            {/* Visual — mock evaluated project card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...EASE, delay: 0.15 }}
              className="relative hidden lg:block"
            >
              <div className="mx-auto w-full max-w-sm rounded-2xl bg-surface-0 p-6 shadow-xl">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-text-secondary">
                      {t("hero.card.label")}
                    </p>
                    <h3 className="mt-1 font-heading text-lg font-bold text-text-primary">
                      {t("hero.card.title")}
                    </h3>
                  </div>
                  <AIScoreBadge score={88} />
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3">
                  {dimensions.map((dim, i) => (
                    <div key={dim.key} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-xs font-medium text-text-secondary">
                        {t(`ai.dimensions.${dim.key}`)}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-1">
                        <motion.div
                          className="h-full rounded-full bg-primary-600"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${dim.score}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.9, delay: 0.2 + i * 0.12, ease: "easeOut" }}
                        />
                      </div>
                      <span className="w-8 text-end font-heading text-sm font-bold text-primary-600">
                        {dim.score}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-sm">
                  <span className="font-medium text-text-primary">{t("hero.card.verdict")}</span>
                  <span className="rounded-full bg-tint-success px-3 py-1 text-xs font-semibold text-success-ink">
                    {t("hero.card.verdictValue")}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ============ How It Works ============ */}
        <section id="how-it-works" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-bold sm:text-4xl">{t("how.title")}</h2>
            <p className="mt-4 text-lg text-text-secondary">{t("how.subtitle")}</p>
          </div>

          <div className="relative mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Timeline connector (desktop) */}
            <span
              aria-hidden
              className="absolute start-0 end-0 top-10 hidden h-px bg-border lg:block"
            />
            {steps.map(({ icon: IconComponent, key }, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ ...EASE, delay: i * 0.1 }}
                className="relative flex flex-col items-start gap-4 rounded-xl border border-border bg-surface-1 p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl bg-accent-100 shadow-glow">
                  <IconComponent size={32} weight="regular" className="text-primary-600" />
                  <span className="absolute -end-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 font-heading text-xs font-bold text-on-primary">
                    {i + 1}
                  </span>
                </span>
                <h3 className="font-heading text-lg font-semibold">{t(`how.steps.${key}.title`)}</h3>
                <p className="text-sm leading-relaxed text-text-secondary">
                  {t(`how.steps.${key}.description`)}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ============ AI Showcase ============ */}
        <section id="ai-showcase" className="scroll-mt-20 bg-surface-1/60 py-20">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div className="order-2 lg:order-1">
              <h2 className="font-heading text-3xl font-bold sm:text-4xl">{t("ai.title")}</h2>
              <p className="mt-4 text-lg text-text-secondary">{t("ai.subtitle")}</p>

              <ul className="mt-8 space-y-4">
                {["fiveDimensions", "gapAnalysis", "confidence"].map((key) => (
                  <li key={key} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-tint-success">
                      <span className="h-2.5 w-2.5 rounded-full bg-success" aria-hidden />
                    </span>
                    <p className="text-text-primary">{t(`ai.points.${key}`)}</p>
                  </li>
                ))}
              </ul>

              <Link href="/projects" className="mt-9 inline-block">
                <Button size="lg">
                  {t("ai.cta")}
                  <ArrowComponent size={20} weight="bold" aria-hidden />
                </Button>
              </Link>
            </div>

            <div className="order-1 flex justify-center lg:order-2">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={EASE}
                className="w-full max-w-md rounded-2xl border border-border bg-surface-0 p-8 shadow-lg"
              >
                <div className="flex flex-col items-center gap-6">
                  <ScoreRing score={85} />
                  <p className="font-heading text-sm font-semibold text-text-primary">
                    {t("ai.sampleProject")}
                  </p>
                </div>
                <div className="mt-8 space-y-4">
                  {dimensions.map((dim) => (
                    <div key={dim.key} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-xs font-medium text-text-secondary">
                        {t(`ai.dimensions.${dim.key}`)}
                      </span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-1">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${dim.score}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.9, delay: 0.15 * dimensions.indexOf(dim), ease: "easeOut" }}
                        />
                      </div>
                      <span className="w-8 text-end font-heading text-sm font-bold text-primary-600">
                        {dim.score}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ============ Social Proof ============ */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <h2 className="text-center font-heading text-3xl font-bold sm:text-4xl">
            {t("proof.title")}
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((key, i) => (
              <motion.figure
                key={key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ ...EASE, delay: i * 0.1 }}
                className="flex flex-col gap-4 rounded-xl border border-border bg-surface-1 p-6 shadow-sm"
              >
                <Quotes size={28} weight="fill" className="text-primary-500/40" aria-hidden />
                <blockquote className="text-text-primary">
                  {t(`proof.testimonials.${key}.quote`)}
                </blockquote>
                <figcaption className="mt-auto flex items-center gap-3 border-t border-border pt-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-600 font-heading text-sm font-bold text-on-primary">
                    {t(`proof.testimonials.${key}.initial`)}
                  </span>
                  <div>
                    <p className="font-heading text-sm font-semibold text-text-primary">
                      {t(`proof.testimonials.${key}.name`)}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {t(`proof.testimonials.${key}.role`)}
                    </p>
                  </div>
                </figcaption>
              </motion.figure>
            ))}
          </div>

          {/* Partners strip */}
          <div className="mt-16 border-t border-border pt-10">
            <p className="text-center text-sm font-medium text-text-secondary">
              {t("proof.partners")}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {(["p1", "p2", "p3", "p4", "p5", "p6"]).map((p) => (
                <span
                  key={p}
                  className="font-heading text-lg font-semibold text-text-secondary/70"
                >
                  {t(`proof.partnerNames.${p}`)}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ============ Final CTA ============ */}
        <section className="relative overflow-hidden bg-primary-600 pattern-islamic">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:py-24">
            <h2 className="font-heading text-3xl font-bold text-on-primary sm:text-4xl">
              {t("cta.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-on-primary/85">{t("cta.subtitle")}</p>

            <form
              onSubmit={handleCtaSubmit}
              className="mx-auto mt-9 flex max-w-md flex-col gap-3 sm:flex-row"
            >
              <label htmlFor="cta-email" className="sr-only">
                {t("cta.emailPlaceholder")}
              </label>
              <div className="relative flex-1">
                <MagnifyingGlass
                  size={18}
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 start-4 my-auto text-on-primary/70"
                />
                <input
                  id="cta-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("cta.emailPlaceholder")}
                  className="h-14 w-full rounded-lg bg-white/95 ps-11 pe-4 text-text-primary placeholder:text-text-secondary/70 focus:outline-none focus:ring-2 focus:ring-white"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className={cn("shrink-0 bg-white text-primary-600 hover:bg-white/90")}
              >
                {t("cta.button")}
              </Button>
            </form>

            <p className="mt-5 text-sm text-on-primary/70">{t("cta.note")}</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
