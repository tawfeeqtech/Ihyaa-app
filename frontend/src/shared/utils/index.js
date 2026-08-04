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

/** Random-ish stable hue for avatar placeholders. */
export function avatarHue(seed) {
  const palette = ["#245173", "#355E7E", "#2F8F6F", "#8A6422", "#5B6B7A"];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}
