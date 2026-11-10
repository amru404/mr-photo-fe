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
  variant = "track",
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: "md" | "lg";
  /** "track" is the soft grey switch (client gallery); "chips" is the Overview's chip deck. */
  variant?: "track" | "chips";
  className?: string;
}) {
  if (variant === "chips") {
    return (
      <div className={cn("no-scrollbar max-w-full overflow-x-auto", className)}>
        <div role="tablist" aria-label={label} className="inline-flex items-center gap-1 rounded-[12px] border border-line bg-surface p-1">
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
                  "flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] px-3.5 text-[13px] font-semibold transition-colors",
                  active ? "bg-ink text-ground" : "text-muted hover:bg-raised hover:text-ink",
                )}
              >
                {option.label}
                {option.count !== undefined && (
                  <span className={cn("font-mono text-[11px] font-normal tracking-normal tabular", active ? "opacity-70" : "text-faint")}>{number(option.count)}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

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
