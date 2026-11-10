"use client";

import { useId, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Copy, GitBranch, Receipt, Trash2, TriangleAlert } from "lucide-react";
import { Field, FieldError, Input, Textarea } from "@/components/ui/field";
import { Pill } from "@/components/ui/pill";
import { Switch, SwitchRow } from "@/components/ui/switch";
import { cn } from "@/lib/cn";
import { count } from "@/lib/format";
import { FIELD_TYPE_LABELS, isChoice, type FieldType, type FormField, type ShowIf } from "@/features/booking-form/schema";
import { IconButton, NumberInput, Popover, Select, TypeMenu } from "./controls";
import { LogicPanel } from "./logic-panel";
import { brokenRules, hasPlaceholder, rangeKind, TYPE_ICONS } from "./model";
import { OptionsEditor } from "./options-editor";

/** Error keys a card shows next to their inputs; anything else is listed at the bottom. */
const PLACED = /^(label|help|placeholder|min|max|min_label|max_label|accept|max_files|is_payment_proof|allow_other|options(\..*)?|show_if(\..*)?)$/;

export interface QuestionCardProps {
  field: FormField;
  index: number;
  fields: FormField[];
  active: boolean;
  autoFocus: boolean;
  errors: Record<string, string>;
  /** Questions grouped under this section (sections only). */
  sectionSize: number;
  dragHandle: ReactNode;
  onActivate: () => void;
  onChange: (patch: Partial<FormField>) => void;
  onType: (type: FieldType) => void;
  onPaymentProof: (on: boolean) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (delta: -1 | 1) => void;
  canDuplicate: boolean;
}

export function QuestionCard(props: QuestionCardProps) {
  const { field, index, fields, active, errors } = props;
  const broken = brokenRules(field, index, fields).length;
  const hasErrors = Object.keys(errors).length > 0;
  const isSection = field.type === "section";

  return (
    <div
      id={`q-${field.id}`}
      className={cn(
        "scroll-mt-20 rounded-card border bg-surface transition-colors",
        active ? "border-ink" : hasErrors ? "border-negative" : "border-line hover:border-control",
      )}
    >
      {isSection && <div aria-hidden="true" className="h-1.5 rounded-t-[15px] bg-ink" />}
      {active ? <Expanded {...props} broken={broken} /> : <Collapsed {...props} broken={broken} hasErrors={hasErrors} />}
    </div>
  );
}

function summary(field: FormField, sectionSize: number): string {
  if (field.type === "section") return `Section · ${count(sectionSize, "question")}`;
  const type = FIELD_TYPE_LABELS[field.type];
  if (isChoice(field.type)) return `${type} · ${count(field.options?.length ?? 0, "option")}${field.allow_other ? " + Other" : ""}`;
  if (field.type === "scale") return `${type} · ${field.min ?? 1} to ${field.max ?? 5}`;
  if (field.type === "file") return `${type} · ${field.accept === "image_pdf" ? "Images or PDF" : "Images"}, up to ${field.max_files ?? 1}`;
  return type;
}

function Collapsed({ field, sectionSize, dragHandle, onActivate, broken, hasErrors }: QuestionCardProps & { broken: number; hasErrors: boolean }) {
  const Icon = TYPE_ICONS[field.type];
  const isSection = field.type === "section";
  const title = field.label.trim() || (isSection ? "Untitled section" : "Untitled question");

  return (
    <div className="flex items-center gap-1 py-2.5 pe-3 ps-1.5 sm:pe-4">
      {dragHandle}
      <button type="button" onClick={onActivate} className="flex min-w-0 flex-1 items-center gap-3 rounded-control py-0.5 text-start">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-[10px]", isSection ? "bg-ink text-ground" : "bg-raised text-muted")}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-sm text-ink", isSection ? "font-semibold" : "font-medium", !field.label.trim() && "text-faint")}>{title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-xs text-muted">{summary(field, sectionSize)}</span>
            {field.required && !isSection && <Pill>Required</Pill>}
            {!!field.show_if?.rules.length && (
              <Pill tone="accent">
                <GitBranch className="size-3" aria-hidden="true" />
                Conditional
              </Pill>
            )}
            {field.type === "file" && field.is_payment_proof && <Pill tone="positive">Payment proof</Pill>}
            {broken > 0 && (
              <Pill tone="warning">
                <TriangleAlert className="size-3" aria-hidden="true" />
                Check logic
              </Pill>
            )}
            {hasErrors && <Pill tone="negative">Needs fixing</Pill>}
          </span>
        </span>
      </button>
    </div>
  );
}

function Expanded(props: QuestionCardProps & { broken: number }) {
  const { field, index, fields, errors, autoFocus, dragHandle, onChange, onType, onDuplicate, onDelete, onMove, canDuplicate } = props;
  const isSection = field.type === "section";
  const requiredId = useId();
  const others = Object.entries(errors).filter(([key]) => !PLACED.test(key));
  const showIfError = Object.entries(errors).find(([key]) => key.startsWith("show_if"))?.[1];

  return (
    <>
      <div className="space-y-4 p-4 sm:p-5">
        <div className={cn("grid gap-4", !isSection && "sm:grid-cols-[minmax(0,1fr)_210px]")}>
          <Field label={isSection ? "Section title" : "Question"} error={errors.label} hint={isSection ? "Optional" : undefined}>
            {(id) => (
              <Input
                id={id}
                autoFocus={autoFocus}
                value={field.label}
                maxLength={200}
                placeholder={isSection ? "e.g. About the venue" : "e.g. How many guests are coming?"}
                onChange={(event) => onChange({ label: event.target.value })}
                invalid={!!errors.label}
                className="font-medium"
              />
            )}
          </Field>
          {!isSection && <TypeField type={field.type} onType={onType} />}
        </div>

        <Field label={isSection ? "Description" : "Help text"} hint="Optional" error={errors.help}>
          {(id) =>
            isSection ? (
              <Textarea id={id} rows={2} maxLength={500} value={field.help ?? ""} onChange={(event) => onChange({ help: event.target.value })} invalid={!!errors.help} />
            ) : (
              <Input
                id={id}
                maxLength={500}
                value={field.help ?? ""}
                placeholder="Shown under the question"
                onChange={(event) => onChange({ help: event.target.value })}
                invalid={!!errors.help}
              />
            )
          }
        </Field>

        {hasPlaceholder(field.type) && (
          <Field label="Placeholder" hint="Optional" error={errors.placeholder}>
            {(id) => (
              <Input
                id={id}
                maxLength={120}
                value={field.placeholder ?? ""}
                placeholder="Shown inside the empty box"
                onChange={(event) => onChange({ placeholder: event.target.value })}
                invalid={!!errors.placeholder}
              />
            )}
          </Field>
        )}

        <TypeSettings {...props} />
      </div>

      <LogicPanel field={field} index={index} fields={fields} onChange={(showIf: ShowIf | null) => onChange({ show_if: showIf })} error={showIfError} />

      {others.length > 0 && (
        <div className="border-t border-rule px-4 py-3 sm:px-5">
          {others.map(([key, message]) => (
            <FieldError key={key} message={message} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rule px-2 py-2 sm:px-3">
        <div className="flex items-center">
          {dragHandle}
          <IconButton label="Move up" disabled={index === 0} onClick={() => onMove(-1)}>
            <ArrowUp className="size-4" />
          </IconButton>
          <IconButton label="Move down" disabled={index === fields.length - 1} onClick={() => onMove(1)}>
            <ArrowDown className="size-4" />
          </IconButton>
        </div>
        <div className="flex items-center">
          <IconButton label="Duplicate" disabled={!canDuplicate} onClick={onDuplicate}>
            <Copy className="size-4" />
          </IconButton>
          <IconButton label="Delete" tone="danger" onClick={onDelete}>
            <Trash2 className="size-4" />
          </IconButton>
          {!isSection && (
            <>
              <span aria-hidden="true" className="mx-2 h-6 w-px bg-line" />
              <label htmlFor={requiredId} className="me-2 text-[13px] font-medium text-ink">
                Required
              </label>
              <span className="me-1.5 flex">
                <Switch id={requiredId} checked={!!field.required} onChange={(required) => onChange({ required })} />
              </span>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/** The type as a button that opens the type menu (icons can't live in a native select). */
function TypeField({ type, onType }: { type: FieldType; onType: (type: FieldType) => void }) {
  const Icon = TYPE_ICONS[type];
  const labelId = useId();
  return (
    <div>
      <p id={labelId} className="text-sm font-medium text-ink">
        Type
      </p>
      <Popover
        align="end"
        className="mt-2"
        trigger={({ open, toggle }) => (
          <button
            type="button"
            onClick={toggle}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-labelledby={labelId}
            className="flex h-10 w-full items-center gap-2.5 rounded-control border border-control bg-surface px-3 text-start text-sm text-ink transition-colors hover:border-faint"
          >
            <Icon className="size-4 shrink-0 text-muted" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{FIELD_TYPE_LABELS[type]}</span>
            <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden="true" />
          </button>
        )}
      >
        {(close) => (
          <TypeMenu
            value={type}
            onPick={(next) => {
              close();
              if (next !== type) onType(next);
            }}
          />
        )}
      </Popover>
    </div>
  );
}

const SCALE_MAX = [2, 3, 4, 5, 6, 7, 8, 9, 10];

function TypeSettings({ field, errors, onChange, onPaymentProof }: QuestionCardProps) {
  const kind = rangeKind(field.type);

  return (
    <>
      {isChoice(field.type) && <OptionsEditor field={field} onChange={onChange} errors={errors} />}

      {(kind === "length" || kind === "value" || kind === "selections") && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={kind === "length" ? "Minimum characters" : kind === "selections" ? "Minimum selections" : "Minimum"}
            hint="Optional"
            error={errors.min}
          >
            {(id) => <NumberInput id={id} min={kind === "value" ? undefined : 0} value={field.min} onChange={(min) => onChange({ min })} invalid={!!errors.min} />}
          </Field>
          <Field
            label={kind === "length" ? "Maximum characters" : kind === "selections" ? "Maximum selections" : "Maximum"}
            hint={kind === "length" ? `Optional · ${field.type === "paragraph" ? "5,000" : "255"} when empty` : "Optional"}
            error={errors.max}
          >
            {(id) => <NumberInput id={id} min={kind === "value" ? undefined : 1} value={field.max} onChange={(max) => onChange({ max })} invalid={!!errors.max} />}
          </Field>
        </div>
      )}

      {kind === "scale" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="From" error={errors.min}>
            {(id) => (
              <Select id={id} value={field.min ?? 1} onChange={(event) => onChange({ min: Number(event.target.value) })} invalid={!!errors.min}>
                <option value={0}>0</option>
                <option value={1}>1</option>
              </Select>
            )}
          </Field>
          <Field label="To" error={errors.max}>
            {(id) => (
              <Select id={id} value={field.max ?? 5} onChange={(event) => onChange({ max: Number(event.target.value) })} invalid={!!errors.max}>
                {SCALE_MAX.map((max) => (
                  <option key={max} value={max}>
                    {max}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={`Label at ${field.min ?? 1}`} hint="Optional, e.g. Not at all" error={errors.min_label}>
            {(id) => <Input id={id} maxLength={40} value={field.min_label ?? ""} onChange={(event) => onChange({ min_label: event.target.value })} invalid={!!errors.min_label} />}
          </Field>
          <Field label={`Label at ${field.max ?? 5}`} hint="Optional, e.g. Very much" error={errors.max_label}>
            {(id) => <Input id={id} maxLength={40} value={field.max_label ?? ""} onChange={(event) => onChange({ max_label: event.target.value })} invalid={!!errors.max_label} />}
          </Field>
        </div>
      )}

      {field.type === "file" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Accepts" hint="Up to 10 MB per file" error={errors.accept}>
              {(id) => (
                <Select id={id} value={field.accept ?? "image"} onChange={(event) => onChange({ accept: event.target.value === "image_pdf" ? "image_pdf" : "image" })}>
                  <option value="image">Images</option>
                  <option value="image_pdf">Images or PDF</option>
                </Select>
              )}
            </Field>
            <Field label="Max files" error={errors.max_files}>
              {(id) => (
                <Select id={id} value={field.max_files ?? 1} onChange={(event) => onChange({ max_files: Number(event.target.value) })}>
                  {[1, 2, 3, 4, 5].map((max) => (
                    <option key={max} value={max}>
                      {max}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          <div className="rounded-control border border-line px-4">
            <SwitchRow
              label={
                <>
                  <Receipt className="size-4 text-muted" aria-hidden="true" />
                  This is the payment proof (DP)
                </>
              }
              description="Clients upload their down payment transfer here. Only one question per form can be the payment proof."
              checked={!!field.is_payment_proof}
              onChange={onPaymentProof}
            />
          </div>
          <FieldError message={errors.is_payment_proof} />
        </>
      )}
    </>
  );
}
