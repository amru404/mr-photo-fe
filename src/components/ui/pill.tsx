import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { ProjectStatusValue, Status } from "@/lib/types";

export type Tone = "neutral" | "accent" | "positive" | "warning" | "negative" | "info";

const TONES: Record<Tone, string> = {
  neutral: "bg-status-draft-soft text-status-draft",
  accent: "bg-accent-soft text-accent-ink",
  positive: "bg-status-completed-soft text-status-completed",
  warning: "bg-status-selection-soft text-status-selection",
  negative: "bg-status-expired-soft text-status-expired",
  info: "bg-status-editing-soft text-status-editing",
};

export function Pill({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 flex-none items-center gap-1 whitespace-nowrap rounded-chip px-1.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_CLASSES: Record<ProjectStatusValue, string> = {
  draft: "bg-status-draft-soft text-status-draft",
  selection: "bg-status-selection-soft text-status-selection",
  editing: "bg-status-editing-soft text-status-editing",
  completed: "bg-status-completed-soft text-status-completed",
  expired: "bg-status-expired-soft text-status-expired",
};

/** One badge per project status, mapped here instead of in every view. */
export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 flex-none items-center gap-1.5 whitespace-nowrap rounded-chip px-2 text-xs font-medium",
        STATUS_CLASSES[status.value],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {status.label}
    </span>
  );
}
