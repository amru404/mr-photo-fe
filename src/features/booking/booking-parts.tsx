"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { BookingStatusValue, PublicBookingRequest } from "./types";
import { shootDay, shootTime } from "./use-booking";

/** A deck as in the dashboard: sentence-case title and a grey line over a rule, then the body. */
export function Deck({
  title,
  text,
  aside,
  className,
  bodyClassName,
  children,
}: {
  title: ReactNode;
  text?: ReactNode;
  aside?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("overflow-hidden rounded-card border border-line bg-surface", className)}>
      <header className="flex items-start justify-between gap-4 border-b border-rule px-5 py-4">
        <div className="min-w-0">
          <h2 className="deck-title">{title}</h2>
          {text && <p className="mt-1.5 text-[13px] text-muted">{text}</p>}
        </div>
        {aside && <div className="shrink-0 pt-px">{aside}</div>}
      </header>
      <div className={bodyClassName ?? "p-5 sm:p-6"}>{children}</div>
    </section>
  );
}

/** Waiting = the selection (amber) tone, Approved = completed (green), Declined = expired (red). */
const STATUS_TONES: Record<BookingStatusValue, { chip: string; dot: string }> = {
  pending: { chip: "bg-status-selection-soft text-status-selection", dot: "bg-status-selection" },
  accepted: { chip: "bg-status-completed-soft text-status-completed", dot: "bg-status-completed" },
  declined: { chip: "bg-status-expired-soft text-status-expired", dot: "bg-status-expired" },
};

/** Shaped like the project StatusBadge, in the status tokens so it follows the theme. */
export function BookingStatusBadge({ request, className }: { request: Pick<PublicBookingRequest, "status" | "status_label">; className?: string }) {
  const tone = STATUS_TONES[request.status];
  return (
    <span className={cn("inline-flex h-6 flex-none items-center gap-1.5 whitespace-nowrap rounded-chip px-2 text-[11px] font-medium", tone.chip, className)}>
      <span className={cn("size-1.5 rounded-full", tone.dot)} aria-hidden="true" />
      {request.status_label}
    </span>
  );
}

/** Everything the visitor sent, as label / value pairs. */
export function RequestSummary({ request, className }: { request: PublicBookingRequest; className?: string }) {
  const rows: { label: string; value: ReactNode; wide?: boolean }[] = [
    { label: "Date", value: shootDay(request.shoot_date) },
    { label: "Time", value: shootTime(request.shoot_time) ?? "Not set" },
    { label: "Location", value: request.location, wide: true },
    { label: "Category", value: request.category ?? "Not set" },
    { label: "Name", value: request.name },
    { label: "Email", value: request.email },
    { label: "Phone", value: request.phone ?? "Not set" },
  ];
  if (request.notes) rows.push({ label: "Notes", value: request.notes, wide: true });

  return (
    <dl className={cn("grid gap-x-6 gap-y-4 sm:grid-cols-2", className)}>
      {rows.map((row) => (
        <div key={row.label} className={cn("min-w-0", row.wide && "sm:col-span-2")}>
          <dt className="eyebrow">{row.label}</dt>
          <dd className="mt-1 whitespace-pre-line break-words text-[13px] leading-5 text-ink">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** "Optional", to the right of a field's label. */
export function OptionalTag() {
  return <span className="text-xs text-faint">Optional</span>;
}
