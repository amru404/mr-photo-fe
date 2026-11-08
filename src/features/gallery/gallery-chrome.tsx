"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, Link2Off } from "lucide-react";
import { BrandInitial } from "@/components/brand";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { APP_NAME } from "@/lib/config";

/** The client's bar: the photographer's brand and the project, nothing else. */
export function GalleryHeader({ brand, title, back, children }: { brand: string; title: string; back?: string; children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ground">
      <div className="mx-auto flex h-15 max-w-[1240px] items-center gap-3 px-4 sm:px-6">
        {back ? (
          <Link
            href={back}
            aria-label="Back to gallery"
            className="-ms-2 flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-ink"
          >
            <ChevronLeft className="size-5" />
          </Link>
        ) : (
          <BrandInitial name={brand} />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted">{brand}</p>
          <p className="truncate text-[15px] font-semibold leading-tight text-ink">{title}</p>
        </div>
        {children}
        <ThemeToggle />
      </div>
    </header>
  );
}

export function GalleryFooter() {
  return <footer className="px-4 pb-[calc(env(safe-area-inset-bottom)+7.5rem)] pt-12 text-center text-xs text-muted">Powered by {APP_NAME}</footer>;
}

/** Expired, revoked or unopened links. */
export function Unavailable({ heading, message, brand }: { heading: string; message: string; brand?: string | null }) {
  return (
    <main className="flex min-h-[80dvh] items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full border border-line text-muted">
          <Link2Off className="size-5" strokeWidth={1.75} />
        </span>
        <h1 className="mt-5 text-section font-semibold text-ink">{heading}</h1>
        <p className="mt-2 text-sm text-muted">{message}</p>
        {brand && <p className="mt-8 text-xs font-medium text-muted">{brand}</p>}
      </div>
    </main>
  );
}

/** Sticky action bar at the foot of the screen, above the home indicator. */
export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface safe-bottom">
      <div className="mx-auto max-w-[1240px] px-4 py-3 sm:px-6">{children}</div>
    </div>
  );
}
