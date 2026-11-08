"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { plural } from "@/lib/format";

const chip =
  "h-8 rounded-control border px-2.5 text-[13px] font-medium tabular transition-colors focus-visible:outline-2 focus-visible:outline-accent";

/** Preset day counts plus a custom number, for one timeline stage. */
export function DaysPicker({
  value,
  onChange,
  presets,
  max,
  label,
  className,
}: {
  value: number | "";
  onChange: (value: number | "") => void;
  presets: number[];
  max: number;
  label: string;
  className?: string;
}) {
  const [custom, setCustom] = useState(() => value !== "" && !presets.includes(Number(value)));
  const input = useRef<HTMLInputElement>(null);

  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {presets.map((preset) => {
        const active = !custom && Number(value) === preset;
        return (
          <button
            key={preset}
            type="button"
            aria-pressed={active}
            onClick={() => {
              setCustom(false);
              onChange(preset);
            }}
            className={cn(chip, active ? "border-primary bg-primary text-on-primary" : "border-control bg-surface text-ink hover:bg-raised")}
          >
            {preset} {plural(preset, "day")}
          </button>
        );
      })}
      <button
        type="button"
        aria-pressed={custom}
        onClick={() => {
          setCustom(true);
          requestAnimationFrame(() => input.current?.focus());
        }}
        className={cn(chip, custom ? "border-accent bg-accent-soft text-accent-ink" : "border-control bg-surface text-ink hover:bg-raised")}
      >
        Custom
      </button>
      {custom && (
        <label className="flex items-center gap-2">
          <input
            ref={input}
            type="number"
            min={1}
            max={max}
            inputMode="numeric"
            value={value}
            onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))}
            className="h-8 w-20 rounded-control border border-control bg-surface px-2 text-sm tabular text-ink focus:border-accent focus:outline-none"
          />
          <span className="text-[13px] text-muted">days</span>
        </label>
      )}
    </div>
  );
}
