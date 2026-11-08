"use client";

import { cn } from "@/lib/cn";
import { number } from "@/lib/format";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/** A filter track as wide as its options; scrolls sideways on a phone instead of wrapping. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <div className={cn("-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)}>
      <div role="tablist" aria-label={label} className="inline-flex gap-0.5 rounded-control bg-raised p-0.5">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(option.value)}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[5px] px-3 font-medium transition-colors",
                size === "lg" ? "h-10 text-sm" : "h-8 text-[13px]",
                active ? "bg-surface text-ink shadow-[0_0_0_1px_var(--line)]" : "text-muted hover:text-ink",
              )}
            >
              {option.label}
              {option.count !== undefined && (
                <span className={cn("tabular text-xs", active ? "text-muted" : "text-faint")}>{number(option.count)}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
