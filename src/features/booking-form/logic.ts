/**
 * Which questions are visible for a given set of answers. The backend
 * (PHP) implements exactly these rules; keep the two in step.
 *
 * - A field is visible when its own `show_if` passes AND the section it sits
 *   in (the nearest section above it) is visible.
 * - A section is visible when its own `show_if` passes.
 * - A rule that points at a hidden field sees that field as empty, so chains
 *   (A shows B, B shows C) collapse when A changes.
 * - `show_if` with no rules counts as "always".
 */
import { OTHER, otherKey, type AnswerValue, type Answers, type ConditionOp, type ConditionRule, type FieldType, type FormField, type FormSchema } from "./schema";

/** Operators that make sense for a field type, in the order the builder offers them. */
export function opsFor(type: FieldType): ConditionOp[] {
  switch (type) {
    case "radio":
    case "select":
    case "yes_no":
      return ["equals", "not_equals", "filled", "empty"];
    case "checkbox":
      return ["includes", "filled", "empty"];
    case "number":
    case "scale":
      return ["equals", "not_equals", "gt", "lt", "filled", "empty"];
    case "file":
      return ["filled", "empty"];
    case "section":
      return [];
    default:
      return ["equals", "not_equals", "filled", "empty"];
  }
}

export const OP_LABELS: Record<ConditionOp, string> = {
  equals: "is",
  not_equals: "is not",
  includes: "includes",
  filled: "is answered",
  empty: "is not answered",
  gt: "is more than",
  lt: "is less than",
};

export function isEmptyValue(value: AnswerValue | undefined): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false; // numbers and booleans (false is an answer)
}

/** Text compare: trimmed, case-insensitive. Numbers compare numerically. */
function same(a: AnswerValue | undefined, b: string | number | boolean | undefined): boolean {
  if (a === null || a === undefined || b === undefined) return false;
  if (typeof a === "boolean" || typeof b === "boolean") return a === b;
  if (typeof a === "number" || typeof b === "number") return Number(a) === Number(b) && String(a).trim() !== "";
  if (Array.isArray(a)) return false;
  return a.trim().toLowerCase() === String(b).trim().toLowerCase();
}

export function evaluateRule(rule: ConditionRule, value: AnswerValue | undefined): boolean {
  switch (rule.op) {
    case "filled":
      return !isEmptyValue(value);
    case "empty":
      return isEmptyValue(value);
    case "equals":
      return same(value, rule.value);
    case "not_equals":
      return !same(value, rule.value);
    case "includes":
      return Array.isArray(value) && rule.value !== undefined && value.includes(String(rule.value));
    case "gt":
      return typeof value === "number" && typeof rule.value === "number" ? value > rule.value : !isEmptyValue(value) && Number(value) > Number(rule.value);
    case "lt":
      return typeof value === "number" && typeof rule.value === "number" ? value < rule.value : !isEmptyValue(value) && Number(value) < Number(rule.value);
  }
}

/**
 * Visible field ids, in order. `fileCounts` gives how many files a file
 * question holds (kept + new), so "is answered" works for uploads too.
 */
export function visibleFields(form: FormSchema, answers: Answers, fileCounts: Record<string, number> = {}): Set<string> {
  const visible = new Set<string>();
  // The value a rule sees: hidden fields read as empty.
  const valueOf = (id: string): AnswerValue | undefined => {
    if (!visible.has(id)) return undefined;
    const field = form.fields.find((f) => f.id === id);
    if (field?.type === "file") return (fileCounts[id] ?? 0) > 0 ? "file" : null;
    return answers[id];
  };
  const passes = (field: FormField) => {
    const rules = field.show_if?.rules ?? [];
    if (rules.length === 0) return true;
    const results = rules.map((rule) => evaluateRule(rule, valueOf(rule.field)));
    return field.show_if?.mode === "any" ? results.some(Boolean) : results.every(Boolean);
  };

  let sectionVisible = true;
  for (const field of form.fields) {
    if (field.type === "section") {
      sectionVisible = passes(field);
      if (sectionVisible) visible.add(field.id);
      continue;
    }
    if (sectionVisible && passes(field)) visible.add(field.id);
  }
  return visible;
}

/** Answers limited to visible questions (what gets sent and stored). */
export function pruneAnswers(form: FormSchema, answers: Answers, fileCounts: Record<string, number> = {}): Answers {
  const visible = visibleFields(form, answers, fileCounts);
  const out: Answers = {};
  for (const field of form.fields) {
    if (field.type === "section" || field.type === "file" || !visible.has(field.id)) continue;
    const value = answers[field.id];
    if (isEmptyValue(value)) continue;
    out[field.id] = value;
    const chose = Array.isArray(value) ? value.includes(OTHER) : value === OTHER;
    if (field.allow_other && chose && !isEmptyValue(answers[otherKey(field.id)])) out[otherKey(field.id)] = answers[otherKey(field.id)];
  }
  return out;
}
