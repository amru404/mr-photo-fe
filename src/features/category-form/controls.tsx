"use client";

import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { Plus } from "lucide-react";
import { inputClass, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { FIELD_TYPE_LABELS, type FieldType } from "@/features/booking-form/schema";
import { QUESTION_TYPES, TYPE_ICONS } from "./model";

/** A native select in the input's frame. */
export function Select({ className, invalid, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select className={cn(inputClass, "appearance-auto pe-2", className)} aria-invalid={invalid || undefined} {...props}>
      {children}
    </select>
  );
}

/** A number input whose empty state is null. */
export function NumberInput({
  value,
  onChange,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & { value: number | null | undefined; onChange: (value: number | null) => void; invalid?: boolean }) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
      className="tabular"
      {...props}
    />
  );
}

/** A square icon button, as on the categories list. */
export function IconButton({ label, tone = "default", className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: "default" | "danger" }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-control text-muted transition-colors hover:bg-raised disabled:pointer-events-none disabled:opacity-40",
        tone === "danger" ? "hover:text-negative" : "hover:text-ink",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** A trigger plus a floating panel that closes on outside click, Escape, or a pick. */
export function Popover({
  trigger,
  children,
  align = "start",
  className,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "start" | "end" | "center";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      {trigger({ open, toggle: () => setOpen((value) => !value) })}
      {open && (
        <div
          className={cn(
            "absolute top-full z-30 mt-1.5 rounded-card border border-line bg-surface p-1.5 shadow-float",
            align === "end" ? "end-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "start-0",
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/** The question types as a two-column menu; `withSection` adds "Section" below. */
export function TypeMenu({ value, onPick, withSection }: { value?: FieldType; onPick: (type: FieldType) => void; withSection?: boolean }) {
  return (
    <div role="menu" aria-label="Question type" className="w-[min(calc(100vw-2rem),400px)]">
      <div className="grid grid-cols-2 gap-0.5">
        {QUESTION_TYPES.map((type) => {
          const Icon = TYPE_ICONS[type];
          const current = type === value;
          return (
            <button
              key={type}
              type="button"
              role="menuitemradio"
              aria-checked={current}
              onClick={() => onPick(type)}
              className={cn(
                "flex h-9 min-w-0 items-center gap-2.5 rounded-control px-2.5 text-start text-[13px] transition-colors",
                current ? "bg-ink font-medium text-ground" : "text-ink hover:bg-raised",
              )}
            >
              <Icon className={cn("size-4 shrink-0", current ? "text-ground" : "text-muted")} aria-hidden="true" />
              <span className="truncate">{FIELD_TYPE_LABELS[type]}</span>
            </button>
          );
        })}
      </div>
      {withSection && (
        <div className="mt-1.5 border-t border-rule pt-1.5">
          <button
            type="button"
            role="menuitem"
            onClick={() => onPick("section")}
            className="flex h-9 w-full items-center gap-2.5 rounded-control px-2.5 text-start text-[13px] text-ink transition-colors hover:bg-raised"
          >
            <Plus className="size-4 shrink-0 text-muted" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">Add section</span>
            <span className="truncate text-xs text-faint">Title and description</span>
          </button>
        </div>
      )}
    </div>
  );
}
