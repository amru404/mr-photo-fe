"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * A modal on the native <dialog>, which gives focus trapping, Escape and
 * the top layer for free. It floats, so it is the one thing with a shadow.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={(event) => {
        // React bubbles these through the component tree, so a dialog opened from inside another must not close its parent.
        event.stopPropagation();
        onClose();
      }}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-2rem)] rounded-card border border-line bg-surface p-0 text-ink shadow-float",
        "backdrop:bg-scrim",
        size === "sm" && "max-w-md",
        size === "md" && "max-w-lg",
        size === "lg" && "max-w-2xl",
      )}
    >
      {open && (
        <div className="flex max-h-[min(85dvh,860px)] flex-col">
          <header className="flex items-start justify-between gap-4 px-6 pt-5">
            <div>
              <h2 className="text-section font-semibold">{title}</h2>
              {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-me-2 -mt-1 flex size-9 items-center justify-center rounded-control text-muted hover:bg-raised hover:text-ink"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </header>
          {children && <div className="overflow-y-auto px-6 pb-6 pt-5">{children}</div>}
          {footer && (
            <footer className="flex flex-wrap items-center justify-end gap-3 rounded-b-card border-t border-line bg-ground px-6 py-3">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  );
}
