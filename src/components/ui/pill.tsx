import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { STATUS_TONE } from "@/lib/status-tone";
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
        "inline-flex h-5 flex-none items-center gap-1 whitespace-nowrap rounded-chip px-2 text-[11px] font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** One tag per project status, in its Overview station colour. */
export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const tone = STATUS_TONE[status.value as ProjectStatusValue];
  return (
    <span
      className={cn("inline-flex h-6 flex-none items-center gap-1.5 whitespace-nowrap rounded-chip px-2 text-[11px] font-medium", className)}
      style={{ background: tone.t, color: tone.d }}
    >
      <span className="size-1.5 rounded-full" style={{ background: tone.r }} aria-hidden="true" />
      {status.label}
    </span>
  );
}
