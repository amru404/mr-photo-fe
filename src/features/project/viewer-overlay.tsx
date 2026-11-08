"use client";

import { useEffect, type ComponentProps } from "react";
import { X } from "lucide-react";
import { PhotoViewer } from "./photo-viewer";

/** The photo viewer over the page, for picks and finals opened from a list. */
export function ViewerOverlay({ title, onClose, ...props }: ComponentProps<typeof PhotoViewer> & { title: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement) onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 overflow-y-auto bg-ground">
      <div className="px-4 pb-8 sm:px-6 lg:px-10">
        <div className="flex h-15 items-center justify-between">
          <p className="text-sm font-semibold">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="-me-2 flex h-9 items-center gap-1.5 rounded-control px-2.5 text-sm text-muted hover:bg-raised hover:text-ink"
          >
            <X className="size-4" /> Close
          </button>
        </div>
        <PhotoViewer {...props} />
      </div>
    </div>
  );
}
