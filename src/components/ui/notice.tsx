import type { ReactNode } from "react";
import { Check, CircleAlert, Info, Lock } from "lucide-react";
import { cn } from "@/lib/cn";

type NoticeTone = "success" | "warning" | "error" | "info" | "neutral" | "locked";

const TONES: Record<NoticeTone, string> = {
  success: "bg-status-completed-soft text-status-completed",
  warning: "border border-warning-line bg-warning-soft text-warning",
  error: "bg-status-expired-soft text-status-expired",
  info: "bg-accent-soft text-accent-ink",
  neutral: "bg-raised text-muted",
  locked: "border border-warning-line bg-warning-soft text-warning",
};

const ICONS: Record<NoticeTone, typeof Check | null> = {
  success: Check,
  warning: CircleAlert,
  error: CircleAlert,
  info: Info,
  neutral: null,
  locked: Lock,
};

/** One-sentence message inside the block it concerns. */
export function Notice({ tone = "info", children, className }: { tone?: NoticeTone; children: ReactNode; className?: string }) {
  const Icon = ICONS[tone];
  return (
    <div role={tone === "error" ? "alert" : undefined} className={cn("flex items-start gap-2.5 rounded-control px-3.5 py-3 text-sm", TONES[tone], className)}>
      {Icon && <Icon className="mt-0.5 size-4 shrink-0" strokeWidth={tone === "success" ? 2.5 : 2} aria-hidden="true" />}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** An empty block keeps its frame: a heading, one sentence and the next step. */
export function EmptyState({
  title,
  children,
  action,
  className,
}: {
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-card border border-dashed border-control px-6 py-12 text-center", className)}>
      <p className="text-base font-semibold text-ink">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{children}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/** Inline error for a block that failed to load, with a retry. */
export function LoadError({ onRetry, what = "this" }: { onRetry: () => void; what?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface px-5 py-4 text-sm">
      <CircleAlert className="size-4 text-negative" aria-hidden="true" />
      <span className="text-ink">Couldn&rsquo;t load {what}.</span>
      <button type="button" onClick={onRetry} className="font-medium text-ink underline-offset-4 hover:underline">
        Retry
      </button>
    </div>
  );
}
