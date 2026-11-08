"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

/**
 * Full-screen photo viewer: a dark room in both themes. Arrow keys and a
 * horizontal swipe move between photos; Escape closes (or first closes
 * whatever `onEscape` handles, like the comments drawer).
 */
export function Lightbox({
  label,
  position,
  src,
  alt,
  loading,
  onClose,
  onPrevious,
  onNext,
  onEscape,
  keysEnabled = true,
  prefetch = [],
  footer,
}: {
  label: string;
  position: string;
  src: string | null;
  alt: string;
  loading?: boolean;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onEscape?: () => boolean;
  keysEnabled?: boolean;
  prefetch?: (string | null)[];
  footer: ReactNode;
}) {
  const startX = useRef<number | null>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (onEscape?.()) return;
        onClose();
      }
      if (!keysEnabled) return;
      if (event.key === "ArrowRight") onNext?.();
      if (event.key === "ArrowLeft") onPrevious?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNext, onPrevious, onEscape, keysEnabled]);

  return (
    <div role="dialog" aria-modal="true" aria-label={alt} className="fixed inset-0 z-50 flex h-dvh flex-col bg-viewer text-viewer-ink">
      <div className="flex items-center gap-2 px-2 pt-[env(safe-area-inset-top)]">
        <button type="button" onClick={onClose} aria-label="Close" className="flex size-12 items-center justify-center rounded-full hover:bg-white/10">
          <X className="size-6" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-sm font-semibold tabular">{position}</p>
          <p className="truncate text-xs text-viewer-muted">{label}</p>
        </div>
        <span className="size-12" />
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center"
        onTouchStart={(event) => {
          startX.current = event.changedTouches[0].clientX;
        }}
        onTouchEnd={(event) => {
          if (startX.current === null) return;
          const dx = event.changedTouches[0].clientX - startX.current;
          startX.current = null;
          if (Math.abs(dx) > 50) (dx < 0 ? onNext : onPrevious)?.();
        }}
      >
        {src ? (
          <img key={src} src={src} alt={alt} draggable={false} className="max-h-full max-w-full select-none object-contain" />
        ) : (
          <p className="text-sm text-viewer-muted">Preview not ready yet</p>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Spinner className="size-8" />
          </div>
        )}

        {onPrevious && (
          <button
            type="button"
            onClick={onPrevious}
            aria-label="Previous photo"
            className="absolute start-3 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:flex"
          >
            <ChevronLeft className="size-6" />
          </button>
        )}
        {onNext && (
          <button
            type="button"
            onClick={onNext}
            aria-label="Next photo"
            className="absolute end-3 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:flex"
          >
            <ChevronRight className="size-6" />
          </button>
        )}
        {prefetch.filter(Boolean).map((url) => (
          <link key={url} rel="prefetch" href={url!} as="image" />
        ))}
      </div>

      {footer}
    </div>
  );
}
