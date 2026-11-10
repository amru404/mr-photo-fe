/**
 * Pure helpers for the form builder: type defaults, rule checks, the
 * clean-up applied before saving, and mapping 422 errors back onto cards.
 */
import {
  CalendarDays,
  CircleDot,
  Clock,
  Hash,
  Heading,
  AtSign,
  Phone,
  SlidersHorizontal,
  SquareCheck,
  SquareChevronDown,
  TextAlignStart,
  TextCursorInput,
  ToggleLeft,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { opsFor } from "@/features/booking-form/logic";
import { isChoice, newId, OTHER, type ConditionOp, type ConditionRule, type FieldType, type FormField, type FormSchema } from "@/features/booking-form/schema";

export const MAX_FIELDS = 60;
export const MAX_OPTIONS = 50;
export const MAX_RULES = 10;

export const TYPE_ICONS: Record<FieldType, LucideIcon> = {
  section: Heading,
  short_text: TextCursorInput,
  paragraph: TextAlignStart,
  number: Hash,
  email: AtSign,
  phone: Phone,
  date: CalendarDays,
  time: Clock,
  radio: CircleDot,
  select: SquareChevronDown,
  checkbox: SquareCheck,
  yes_no: ToggleLeft,
  scale: SlidersHorizontal,
  file: Upload,
};

/** Question types in the order the pickers offer them (section is offered separately). */
export const QUESTION_TYPES: FieldType[] = [
  "short_text",
  "paragraph",
  "radio",
  "checkbox",
  "select",
  "yes_no",
  "scale",
  "number",
  "email",
  "phone",
  "date",
  "time",
  "file",
];

export function hasPlaceholder(type: FieldType): boolean {
  return type === "short_text" || type === "paragraph" || type === "number" || type === "email" || type === "phone";
}

export function allowsOther(type: FieldType): boolean {
  return type === "radio" || type === "checkbox";
}

/** What min/max mean for a type, or null when it has none. */
export function rangeKind(type: FieldType): "length" | "value" | "selections" | "scale" | null {
  switch (type) {
    case "short_text":
    case "paragraph":
      return "length";
    case "number":
      return "value";
    case "checkbox":
      return "selections";
    case "scale":
      return "scale";
    default:
      return null;
  }
}

export function needsValue(op: ConditionOp): boolean {
  return op !== "filled" && op !== "empty";
}

export function newOption(label: string) {
  return { id: newId(), label };
}

/**
 * The field rebuilt for a (new) type: keeps what carries over (label, help,
 * required, logic, options between choice types) and fills the type's defaults.
 */
export function withType(field: FormField, type: FieldType): FormField {
  const next: FormField = { id: field.id, type, label: field.label, help: field.help ?? null, show_if: field.show_if ?? null };
  if (type !== "section") next.required = field.required ?? false;
  if (hasPlaceholder(type)) next.placeholder = field.placeholder ?? null;
  if (isChoice(type)) {
    next.options = field.options?.length ? field.options : [newOption("Option 1")];
    if (allowsOther(type)) next.allow_other = field.allow_other ?? false;
  }
  const kind = rangeKind(type);
  if (kind === "scale") {
    next.min = 1;
    next.max = 5;
    next.min_label = null;
    next.max_label = null;
  } else if (kind && rangeKind(field.type) === kind) {
    next.min = field.min ?? null;
    next.max = field.max ?? null;
  } else if (kind) {
    next.min = null;
    next.max = null;
  }
  if (type === "file") {
    next.accept = field.accept ?? "image";
    next.max_files = field.max_files ?? 1;
    next.is_payment_proof = field.type === "file" ? (field.is_payment_proof ?? false) : false;
  }
  return next;
}

export function blankField(type: FieldType): FormField {
  return withType({ id: newId(), type, label: "" }, type);
}

/** A copy with fresh ids (field and options); never the payment proof. */
export function duplicateField(field: FormField): FormField {
  return {
    ...field,
    id: newId(),
    options: field.options?.map((option) => ({ ...option, id: newId() })),
    is_payment_proof: field.type === "file" ? false : field.is_payment_proof,
  };
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// --- Logic ------------------------------------------------------------------

/** The questions a field's rules may point at: earlier, non-section. */
export function ruleCandidates(fields: FormField[], index: number): FormField[] {
  return fields.slice(0, index).filter((field) => field.type !== "section");
}

export function defaultValue(ref: FormField, op: ConditionOp): ConditionRule["value"] {
  if (!needsValue(op)) return undefined;
  if (isChoice(ref.type)) return ref.options?.[0]?.id ?? (ref.allow_other ? OTHER : undefined);
  if (ref.type === "yes_no") return true;
  if (ref.type === "scale") return ref.min ?? 1;
  return undefined;
}

export function defaultRule(ref: FormField): ConditionRule {
  const op = opsFor(ref.type)[0];
  const rule: ConditionRule = { field: ref.id, op };
  const value = defaultValue(ref, op);
  if (value !== undefined) rule.value = value;
  return rule;
}

/**
 * Why a rule no longer works after edits elsewhere (the question it checks
 * was deleted, moved below, changed type, or lost the chosen option), or null.
 * Broken rules are dropped on save.
 */
export function ruleProblem(rule: ConditionRule, index: number, fields: FormField[]): string | null {
  const refIndex = fields.findIndex((field) => field.id === rule.field);
  if (refIndex === -1) return "The question it checks was deleted.";
  const ref = fields[refIndex];
  if (ref.type === "section") return "It points at a section, which has no answer.";
  if (refIndex >= index) return "The question it checks is now below this one.";
  if (!opsFor(ref.type).includes(rule.op)) return "The question it checks changed type.";
  if (needsValue(rule.op) && rule.value !== undefined && rule.value !== null && rule.value !== "") {
    if (isChoice(ref.type)) {
      const value = String(rule.value);
      const exists = value === OTHER ? !!ref.allow_other && allowsOther(ref.type) : (ref.options ?? []).some((option) => option.id === value);
      if (!exists) return "The option it checks was removed.";
    } else if (ref.type === "yes_no" && typeof rule.value !== "boolean") {
      return "The question it checks changed type.";
    } else if ((ref.type === "number" || ref.type === "scale") && typeof rule.value !== "number") {
      return "The question it checks changed type.";
    }
  }
  return null;
}

/** A rule that works but still needs its value typed in. */
export function ruleIncomplete(rule: ConditionRule): boolean {
  return needsValue(rule.op) && (rule.value === undefined || rule.value === null || (typeof rule.value === "string" && rule.value.trim() === ""));
}

export function brokenRules(field: FormField, index: number, fields: FormField[]): string[] {
  return (field.show_if?.rules ?? []).map((rule) => ruleProblem(rule, index, fields)).filter((problem): problem is string => problem !== null);
}

// --- Saving -----------------------------------------------------------------

const text = (value: string | null | undefined) => {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
};

/** The form as it gets saved and previewed: only the keys each type uses, broken rules dropped. */
export function cleanForm(fields: FormField[]): FormSchema {
  return {
    version: 1,
    fields: fields.map((field, index) => {
      const out: FormField = { id: field.id, type: field.type, label: field.label.trim(), help: text(field.help) };
      if (field.type !== "section") out.required = !!field.required;
      if (hasPlaceholder(field.type)) out.placeholder = text(field.placeholder);
      if (isChoice(field.type)) {
        out.options = (field.options ?? []).map((option) => ({ id: option.id, label: option.label.trim() }));
        if (allowsOther(field.type)) out.allow_other = !!field.allow_other;
      }
      const kind = rangeKind(field.type);
      if (kind) {
        out.min = field.min ?? null;
        out.max = field.max ?? null;
      }
      if (kind === "scale") {
        out.min_label = text(field.min_label);
        out.max_label = text(field.max_label);
      }
      if (field.type === "file") {
        out.accept = field.accept ?? "image";
        out.max_files = field.max_files ?? 1;
        out.is_payment_proof = !!field.is_payment_proof;
      }
      const rules = (field.show_if?.rules ?? [])
        .filter((rule) => ruleProblem(rule, index, fields) === null)
        .map((rule) => (needsValue(rule.op) ? { field: rule.field, op: rule.op, value: rule.value } : { field: rule.field, op: rule.op }));
      out.show_if = rules.length > 0 ? { mode: field.show_if?.mode === "any" ? "any" : "all", rules } : null;
      return out;
    }),
  };
}

/** Per-card errors: field id → { "label" | "options.2.label" | … → message }. */
export type CardErrors = Record<string, Record<string, string>>;

/** The checks worth catching before a round trip; the server re-validates everything. */
export function validateLocally(fields: FormField[]): CardErrors {
  const errors: CardErrors = {};
  const add = (id: string, key: string, message: string) => {
    errors[id] ??= {};
    errors[id][key] ??= message;
  };
  fields.forEach((field, index) => {
    if (field.type !== "section" && field.label.trim() === "") add(field.id, "label", "Enter the question.");
    if (isChoice(field.type)) {
      const options = field.options ?? [];
      if (options.length === 0) add(field.id, "options", "Add at least one option.");
      options.forEach((option, i) => {
        if (option.label.trim() === "") add(field.id, `options.${i}.label`, "Enter the option text.");
      });
    }
    const kind = rangeKind(field.type);
    if (kind && kind !== "scale" && field.min != null && field.max != null && field.min > field.max) add(field.id, "max", "The maximum can't be less than the minimum.");
    if ((kind === "length" || kind === "selections") && field.min != null && field.min < 0) add(field.id, "min", "The minimum can't be negative.");
    if (kind === "selections" && field.max != null && field.max < 1) add(field.id, "max", "The maximum must be at least 1.");
    const rules = field.show_if?.rules ?? [];
    if (rules.some((rule) => ruleProblem(rule, index, fields) === null && ruleIncomplete(rule))) add(field.id, "show_if", "Finish or remove the condition that has no value.");
  });
  return errors;
}

/**
 * Splits a 422's errors into per-card messages (keys "form.fields.N.rest",
 * N being the index in the list that was sent), the deposit's and the rest.
 */
export function mapServerErrors(errors: Record<string, string[]>, sent: FormField[]): { cards: CardErrors; deposit?: string; general: string[] } {
  const cards: CardErrors = {};
  const general: string[] = [];
  let deposit: string | undefined;
  for (const [key, messages] of Object.entries(errors)) {
    const message = messages[0];
    if (!message) continue;
    if (key === "deposit_percent") {
      deposit = message;
      continue;
    }
    const match = /^form\.fields\.(\d+)(?:\.(.+))?$/.exec(key);
    const field = match ? sent[Number(match[1])] : undefined;
    if (field) {
      cards[field.id] ??= {};
      cards[field.id][match?.[2] ?? "field"] = message;
    } else {
      general.push(message);
    }
  }
  return { cards, deposit, general };
}
