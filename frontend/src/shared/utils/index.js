/**
 * Tiny class-name combiner (avoids a clsx/tailwind-merge dependency).
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/** Format a number with locale-aware separators. */
export function formatNumber(n) {
  return new Intl.NumberFormat("en-US").format(n);
}

/** Keep the first letter of a name for avatars. */
export function initials(name) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

/**
 * Stable, theme-aware hue for avatar placeholders.
 *
 * Returns an oklch color: the seed picks a hue (0–360), while the fixed
 * lightness/chroma keep the fill dark enough that the white initials meet
 * WCAG AA (~4.5:1) on light cards and stay legible on dark surfaces too.
 * (Fixed hexes like the old palette did not adapt to dark mode.)
 */
export function avatarHue(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `oklch(0.45 0.12 ${hue})`;
}

/**
 * Sanitize a Meilisearch `_formatted` snippet before injecting it through
 * `dangerouslySetInnerHTML`. The engine only emits `<em>…</em>` highlight tags,
 * but any other markup must be neutralised (XSS guard): tag attributes are
 * dropped and every remaining `<`/`>` is escaped. Entities (`&amp;`, `&lt;`)
 * produced by the engine are left untouched.
 */
export function sanitizeHighlightHtml(html) {
  return String(html ?? "")
    .replace(/<\/?em\b[^>]*>/gi, (m) => (m.startsWith("</") ? "</em>" : "<em>"))
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
