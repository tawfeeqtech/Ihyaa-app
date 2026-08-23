"use client";

import { useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useLocale } from "next-intl";
import { cn } from "@/shared/utils";

/**
 * ImageGallery — lightweight image gallery with prev/next navigation and a
 * thumbnail strip. Arrow icons flip automatically for RTL (Arabic).
 *
 * @param {Array<{url: string, original_name?: string, is_cover?: boolean}>} images
 * @param {string} prevLabel  Translated "Previous" label.
 * @param {string} nextLabel  Translated "Next" label.
 */
export function ImageGallery({ images = [], prevLabel = "Previous", nextLabel = "Next" }) {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const [index, setIndex] = useState(0);

  if (!Array.isArray(images) || images.length === 0) return null;

  const count = images.length;
  const current = images[Math.min(Math.max(index, 0), count - 1)];

  const go = (next) => setIndex((next + count) % count);

  const navClass =
    "absolute inset-y-0 my-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-0/90 text-text-primary shadow-md ring-1 ring-border transition-colors hover:bg-surface-1 focus-visible:outline-2 focus-visible:outline-primary-600";

  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-surface-0">
      <div className="relative aspect-video">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.original_name ?? ""}
          className="h-full w-full object-contain"
          loading="lazy"
        />

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label={prevLabel}
              className={cn(navClass, "start-3")}
            >
              {isRtl ? <CaretRight size={22} aria-hidden /> : <CaretLeft size={22} aria-hidden />}
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label={nextLabel}
              className={cn(navClass, "end-3")}
            >
              {isRtl ? <CaretLeft size={22} aria-hidden /> : <CaretRight size={22} aria-hidden />}
            </button>
          </>
        )}
      </div>

      <figcaption className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
        <span className="min-w-0 truncate text-sm text-text-secondary">
          {current.original_name ?? ""}
        </span>
        <span aria-live="polite" className="shrink-0 text-xs font-medium text-text-secondary">
          {index + 1} / {count}
        </span>
      </figcaption>

      {count > 1 && (
        <div className="flex gap-2 overflow-x-auto border-t border-border px-4 py-3">
          {images.map((img, i) => (
            <button
              key={`${img.url}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={img.original_name ?? `Image ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              className={cn(
                "h-14 w-20 shrink-0 overflow-hidden rounded-lg border transition-all",
                i === index
                  ? "border-primary-600 ring-2 ring-primary-600/30"
                  : "border-border opacity-70 hover:opacity-100"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </figure>
  );
}
