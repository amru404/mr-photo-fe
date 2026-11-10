"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { ChevronLeft, Link2Off } from "lucide-react";
import { BrandInitial, Mark } from "@/components/brand";
import { Spinner } from "@/components/ui/spinner";
import { ThemeSwitch } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/cn";
import { APP_NAME } from "@/lib/config";

/** The app's gutters, centred at the gallery's width. */
export const PAGE = "mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-10";
/** Narrow pages (review): the same gutters, a shorter line. */
export const PAGE_NARROW = "mx-auto w-full max-w-[960px] px-4 sm:px-6 lg:px-10";

/** Page titles inside a board, as on the project screen. */
export const BOARD_TITLE = "text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl";

/** The client's bar: the photographer's brand and the project, nothing else. */
export function GalleryHeader({ brand, title, back, children }: { brand: string; title: string; back?: string; children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 bg-surface shadow-bar">
      <div className={cn(PAGE, "flex h-14 items-center gap-3")}>
        {back ? (
          <Link
            href={back}
            aria-label="Back to gallery"
            className="-ms-2 flex size-10 shrink-0 items-center justify-center rounded-control text-muted transition-colors hover:bg-raised hover:text-ink"
          >
            <ChevronLeft className="size-5" />
          </Link>
        ) : (
          <BrandInitial name={brand} tone="ink" size="sm" />
        )}
        <div className="min-w-0 flex-1">
          <p className="eyebrow truncate">{brand}</p>
          <p className="truncate text-[14px] font-semibold leading-5 tracking-[-0.01em] text-ink">{title}</p>
        </div>
        {children}
        <ThemeSwitch />
      </div>
    </header>
  );
}

export function GalleryFooter() {
  return (
    <footer className="flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+7.5rem)] pt-12">
      <p className="eyebrow inline-flex items-center gap-2">
        <Mark className="size-4" />
        Powered by {APP_NAME}
      </p>
    </footer>
  );
}

/** The project board's faint drafting grid. */
export function GridBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(var(--rule)_1px,transparent_1px),linear-gradient(90deg,var(--rule)_1px,transparent_1px)] [background-size:44px_44px]"
    />
  );
}

/** A framed board on the grid, like the project screen's header. */
export function Board({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("relative overflow-hidden rounded-board border border-line bg-surface", className)} {...props}>
      <GridBackdrop />
      <div className="relative">{children}</div>
    </section>
  );
}

/** A flat loading block; unlike Skeleton it has no radius of its own, so pass one. */
export function Placeholder({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("block bg-raised", className)} />;
}

/** A small mono count on a raised chip: "2 selected", "3 / 4". */
export function CountPill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-[8px] bg-raised px-2 py-0.5 font-mono text-xs text-ink tabular", className)}>
      {children}
    </span>
  );
}

type NoteTone = "positive" | "warning" | "negative" | "accent" | "neutral";

const NOTE_MARKS: Record<NoteTone, string> = {
  positive: "bg-status-completed-soft text-status-completed",
  warning: "bg-warning-soft text-warning",
  negative: "bg-status-expired-soft text-status-expired",
  accent: "bg-accent-soft text-accent",
  neutral: "bg-raised text-muted",
};

const NOTE_DOTS: Record<NoteTone, string> = {
  positive: "bg-positive",
  warning: "bg-warning",
  negative: "bg-negative",
  accent: "bg-accent",
  neutral: "bg-faint",
};

/** A quiet deck row for a status line: a coloured mark, one or two sentences. */
export function Note({ tone = "neutral", icon, children, className }: { tone?: NoteTone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div
      role={tone === "negative" ? "alert" : undefined}
      className={cn("flex items-start gap-3 rounded-card border border-line bg-surface px-4 py-3 text-[13px] leading-5 text-muted", className)}
    >
      {icon ? (
        <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full [&>svg]:size-3.5", NOTE_MARKS[tone])} aria-hidden="true">
          {icon}
        </span>
      ) : (
        <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", NOTE_DOTS[tone])} aria-hidden="true" />
      )}
      <div className={cn("min-w-0", icon ? "pt-0.5" : null)}>{children}</div>
    </div>
  );
}

type ActionVariant = "primary" | "secondary" | "accent" | "love";

const ACTION_VARIANTS: Record<ActionVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  secondary: "border border-line bg-surface text-ink hover:bg-raised",
  accent: "bg-accent text-on-accent hover:bg-accent-hover",
  love: "bg-love text-white hover:opacity-90",
};

/**
 * The app's primary action, as on the Projects "New project" link. `extra`
 * is for layout only (width, margin, flex): it must not restyle the button.
 */
export function actionClass(variant: ActionVariant = "primary", extra?: string): string {
  return cn(
    "inline-flex h-[42px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[12px] px-4 text-[13px] font-semibold transition-colors",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    ACTION_VARIANTS[variant],
    extra,
  );
}

export function ActionButton({
  variant = "primary",
  loading,
  icon,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: { variant?: ActionVariant; loading?: boolean; icon?: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={actionClass(variant, className)} disabled={disabled || loading} {...props}>
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
    </button>
  );
}

/** Expired, revoked or unopened links. */
export function Unavailable({ heading, message, brand }: { heading: string; message: string; brand?: string | null }) {
  return (
    <main className="flex min-h-[80dvh] items-center justify-center px-4 sm:px-6">
      <Board className="w-full max-w-sm">
        <div className="p-6 text-center sm:p-8">
          <span className="mx-auto flex size-10 items-center justify-center rounded-control bg-raised text-muted">
            <Link2Off className="size-5" strokeWidth={1.75} />
          </span>
          <p className="eyebrow mt-5">{brand || "Client gallery"}</p>
          <h1 className="mt-1.5 text-section font-semibold tracking-[-0.01em] text-ink">{heading}</h1>
          <p className="mt-1.5 text-[13px] text-muted">{message}</p>
        </div>
      </Board>
    </main>
  );
}

/** Sticky action bar at the foot of the screen, above the home indicator. */
export function BottomBar({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur safe-bottom">
      <div className={cn(narrow ? PAGE_NARROW : PAGE, "py-3")}>{children}</div>
    </div>
  );
}
