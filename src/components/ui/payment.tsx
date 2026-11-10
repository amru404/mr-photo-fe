"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

/** Quick picks under the slider: nothing, the usual down payments, paid in full. */
export const PAYMENT_PRESETS = [0, 25, 50, 75, 100] as const;

export type PaymentState = "unpaid" | "partial" | "paid";

export function paymentState(percent: number): PaymentState {
  return percent >= 100 ? "paid" : percent > 0 ? "partial" : "unpaid";
}

/** "Paid", "DP 30%" or "Unpaid". */
export function paymentLabel(percent: number): string {
  const state = paymentState(percent);
  return state === "paid" ? "Paid" : state === "partial" ? `DP ${percent}%` : "Unpaid";
}

const BADGE: Record<PaymentState, string> = {
  paid: "bg-status-completed-soft text-status-completed",
  partial: "bg-status-selection-soft text-status-selection",
  unpaid: "bg-status-draft-soft text-muted",
};

const BAR: Record<PaymentState, string> = {
  paid: "bg-status-completed",
  partial: "bg-status-selection",
  unpaid: "bg-control",
};

/** How much is paid, as a tag; with `bar`, a thin progress line underneath. */
export function PaymentBadge({ percent, bar, className }: { percent: number; bar?: boolean; className?: string }) {
  const state = paymentState(percent);
  return (
    <span className={cn("inline-flex flex-col gap-1", className)} title={`${percent}% paid`}>
      <span className={cn("inline-flex h-5 w-fit flex-none items-center whitespace-nowrap rounded-chip px-2 text-[11px] font-medium", BADGE[state])}>
        {paymentLabel(percent)}
      </span>
      {bar && <PaymentBar percent={percent} />}
    </span>
  );
}

export function PaymentBar({ percent, className }: { percent: number; className?: string }) {
  const state = paymentState(percent);
  return (
    <span className={cn("block h-1 w-16 overflow-hidden rounded-full bg-raised", className)} aria-hidden="true">
      <span className={cn("block h-full rounded-full transition-[width]", BAR[state])} style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
    </span>
  );
}

/**
 * 0–100% in steps of 5, with the big number on the right and preset chips
 * underneath. Anything between 0 and 100 is a down payment.
 */
export function PaymentSlider({ value, onChange, disabled }: { value: number; onChange: (percent: number) => void; disabled?: boolean }) {
  const id = useId();
  const state = paymentState(value);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          Payment received
        </label>
        <span className="flex items-baseline gap-2">
          <span className="font-mono text-2xl font-semibold tabular text-ink">{value}%</span>
          <span className={cn("text-xs font-medium", state === "paid" ? "text-status-completed" : state === "partial" ? "text-status-selection" : "text-muted")}>
            {state === "paid" ? "Paid in full" : state === "partial" ? "Down payment" : "Nothing yet"}
          </span>
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-valuetext={`${value}% paid`}
        className="payment-range mt-3 w-full"
        style={{ "--fill": `${value}%` } as React.CSSProperties}
      />
      <div className="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label="Quick amounts">
        {PAYMENT_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={disabled}
            onClick={() => onChange(preset)}
            aria-pressed={value === preset}
            className={cn(
              "h-7 rounded-[8px] px-2.5 font-mono text-[11px] tabular transition-colors disabled:opacity-50",
              value === preset ? "bg-ink text-ground" : "border border-line bg-surface text-muted hover:bg-raised hover:text-ink",
            )}
          >
            {preset}%
          </button>
        ))}
      </div>
    </div>
  );
}
