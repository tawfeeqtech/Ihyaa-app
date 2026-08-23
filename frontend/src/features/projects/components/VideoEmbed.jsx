"use client";

import { useMemo } from "react";

/**
 * Convert a YouTube/Vimeo watch URL into an embeddable iframe URL.
 * Returns null for anything that isn't a supported YouTube/Vimeo link.
 */
function toEmbedUrl(url, provider) {
  if (!url) return null;
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }

  const host = u.hostname.replace(/^www\./, "");

  if (provider === "youtube" || host === "youtube.com" || host === "youtu.be") {
    if (host === "youtu.be") return `https://www.youtube.com/embed${u.pathname}`;
    const v = u.searchParams.get("v");
    if (v) return `https://www.youtube.com/embed/${v}`;
    const m = u.pathname.match(/^\/(embed|shorts|live)\/([\w-]+)/);
    if (m) return `https://www.youtube.com/embed/${m[2]}`;
    return null;
  }

  if (provider === "vimeo" || host === "vimeo.com" || host === "player.vimeo.com") {
    if (host === "player.vimeo.com") return u.href;
    const m = u.pathname.match(/^\/(\d+)/);
    if (m) return `https://player.vimeo.com/video/${m[1]}`;
    return null;
  }

  return null;
}

/**
 * VideoEmbed — responsive iframe embed for YouTube/Vimeo from a watch URL.
 *
 * @param {string}  url       The project's videoUrl (e.g. https://youtu.be/…).
 * @param {string}  provider  "youtube" | "vimeo" (hint; auto-detected if omitted).
 * @param {string}  title     Accessible iframe title.
 */
export function VideoEmbed({ url, provider, title = "Video" }) {
  const embedUrl = useMemo(() => toEmbedUrl(url, provider), [url, provider]);

  if (!embedUrl) return null;

  return (
    <div className="aspect-video overflow-hidden rounded-xl bg-surface-0">
      <iframe
        src={embedUrl}
        title={title}
        className="h-full w-full"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
