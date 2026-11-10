"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { FieldError, inputClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import type { FieldOption, FormField } from "@/features/booking-form/schema";
import { IconButton } from "./controls";
import { allowsOther, MAX_OPTIONS, moveItem, newOption } from "./model";

/** The choices of a radio / dropdown / checkboxes question. */
export function OptionsEditor({
  field,
  onChange,
  errors,
}: {
  field: FormField;
  onChange: (patch: Partial<FormField>) => void;
  errors: Record<string, string>;
}) {
  const options = field.options ?? [];
  const [focusId, setFocusId] = useState<string | null>(null);
  const inputs = useRef(new Map<string, HTMLInputElement>());

  useEffect(() => {
    if (!focusId) return;
    inputs.current.get(focusId)?.focus();
    setFocusId(null);
  }, [focusId]);

  const set = (next: FieldOption[]) => onChange({ options: next });
  const full = options.length >= MAX_OPTIONS;

  function addAfter(at: number) {
    if (full) return;
    const option = newOption(`Option ${options.length + 1}`);
    set([...options.slice(0, at + 1), option, ...options.slice(at + 1)]);
    setFocusId(option.id);
  }

  return (
    <div>
      <p className="text-sm font-medium text-ink">Options</p>
      <ol className="mt-2 space-y-1.5">
        {options.map((option, at) => (
          <li key={option.id}>
            <div className="flex items-center gap-1.5">
              <Glyph type={field.type} at={at} />
              <input
                ref={(element) => {
                  if (element) inputs.current.set(option.id, element);
                  else inputs.current.delete(option.id);
                }}
                aria-label={`Option ${at + 1}`}
                value={option.label}
                maxLength={120}
                placeholder={`Option ${at + 1}`}
                className={inputClass}
                aria-invalid={!!errors[`options.${at}.label`] || !!errors[`options.${at}`] || undefined}
                onChange={(event) => set(options.map((item) => (item.id === option.id ? { ...item, label: event.target.value } : item)))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addAfter(at);
                  }
                }}
                onFocus={(event) => {
                  // A fresh "Option 3" is selected so typing replaces it.
                  if (/^Option \d+$/.test(option.label)) event.target.select();
                }}
              />
              <span className="flex shrink-0">
                <IconButton label="Move option up" disabled={at === 0} onClick={() => set(moveItem(options, at, at - 1))}>
                  <ArrowUp className="size-4" />
                </IconButton>
                <IconButton label="Move option down" disabled={at === options.length - 1} onClick={() => set(moveItem(options, at, at + 1))}>
                  <ArrowDown className="size-4" />
                </IconButton>
                <IconButton label="Remove option" tone="danger" disabled={options.length <= 1} onClick={() => set(options.filter((item) => item.id !== option.id))}>
                  <X className="size-4" />
                </IconButton>
              </span>
            </div>
            <FieldError message={errors[`options.${at}.label`] ?? errors[`options.${at}.id`] ?? errors[`options.${at}`]} className="ms-8" />
          </li>
        ))}

        {field.allow_other && allowsOther(field.type) && (
          <li className="flex items-center gap-1.5">
            <Glyph type={field.type} at={options.length} />
            <span className="flex h-10 min-w-0 flex-1 items-center rounded-control border border-dashed border-control px-3 text-sm text-muted">Other…</span>
            <IconButton label="Remove “Other”" tone="danger" onClick={() => onChange({ allow_other: false })}>
              <X className="size-4" />
            </IconButton>
          </li>
        )}
      </ol>

      <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-1 ps-6">
        <button
          type="button"
          onClick={() => addAfter(options.length - 1)}
          disabled={full}
          className="inline-flex h-8 items-center gap-1.5 rounded-control px-2 text-[13px] font-medium text-ink transition-colors hover:bg-raised disabled:opacity-50"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add option
        </button>
        {allowsOther(field.type) && !field.allow_other && (
          <>
            <span className="text-[13px] text-faint">or</span>
            <button
              type="button"
              onClick={() => onChange({ allow_other: true })}
              className="inline-flex h-8 items-center rounded-control px-2 text-[13px] font-medium text-ink transition-colors hover:bg-raised"
            >
              Add &ldquo;Other&rdquo;
            </button>
          </>
        )}
        {full && <span className="text-xs text-faint">Up to {MAX_OPTIONS} options.</span>}
      </div>
      <FieldError message={errors.options ?? errors.allow_other} />
    </div>
  );
}

/** The mark before an option: a radio, a box, or its number in a dropdown. */
function Glyph({ type, at }: { type: FormField["type"]; at: number }) {
  if (type === "select") return <span className="w-5 shrink-0 text-end font-mono text-[11px] text-faint tabular">{at + 1}.</span>;
  return <span aria-hidden="true" className={cn("ms-1 size-4 shrink-0 border-[1.5px] border-control", type === "radio" ? "rounded-full" : "rounded-[4px]")} />;
}
