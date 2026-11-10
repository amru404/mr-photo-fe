/**
 * A category's custom booking form, stored as JSON on the category. The base
 * fields (name, email, phone, date, time, location, category) are fixed and
 * are NOT part of this schema; these questions show under them.
 *
 * The backend validates this same shape on save and evaluates the same
 * visibility rules (see logic.ts) when a request comes in.
 */

export type FieldType =
  | "section"
  | "short_text"
  | "paragraph"
  | "number"
  | "email"
  | "phone"
  | "date"
  | "time"
  | "radio"
  | "select"
  | "checkbox"
  | "yes_no"
  | "scale"
  | "file";

export interface FieldOption {
  /** ^[a-z0-9]{6,24}$, unique in the form; "other" is reserved. */
  id: string;
  label: string;
}

export type ConditionOp = "equals" | "not_equals" | "includes" | "filled" | "empty" | "gt" | "lt";

export interface ConditionRule {
  /** Id of an earlier, non-section field. */
  field: string;
  op: ConditionOp;
  /** Option id (or "other") for choices, boolean for yes_no, number for number/scale, text otherwise. Unused for filled/empty. */
  value?: string | number | boolean;
}

export interface ShowIf {
  mode: "all" | "any";
  rules: ConditionRule[];
}

export interface FormField {
  /** ^[a-z0-9]{6,24}$, unique in the form. */
  id: string;
  type: FieldType;
  /** Question text; for a section, its title (optional). */
  label: string;
  help?: string | null;
  placeholder?: string | null;
  /** Ignored for section. */
  required?: boolean;
  /** radio, select, checkbox. */
  options?: FieldOption[];
  /** radio, checkbox: adds an "Other" choice that reveals a text input. */
  allow_other?: boolean;
  /**
   * short_text / paragraph: min/max length. number: min/max value.
   * checkbox: min/max selections. scale: min ∈ {0,1}, max 2–10.
   */
  min?: number | null;
  max?: number | null;
  /** scale only. */
  min_label?: string | null;
  max_label?: string | null;
  /** file only. */
  accept?: "image" | "image_pdf";
  max_files?: number;
  is_payment_proof?: boolean;
  show_if?: ShowIf | null;
}

export interface FormSchema {
  version: 1;
  fields: FormField[];
}

/** Raw answer values, keyed by field id; "<id>__other" holds the text for an "Other" choice. */
export type AnswerValue = string | number | boolean | string[] | null;
export type Answers = Record<string, AnswerValue>;

export const OTHER = "other";
export const otherKey = (fieldId: string) => `${fieldId}__other`;

export const EMPTY_FORM: FormSchema = { version: 1, fields: [] };

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  section: "Section",
  short_text: "Short answer",
  paragraph: "Paragraph",
  number: "Number",
  email: "Email",
  phone: "Phone",
  date: "Date",
  time: "Time",
  radio: "Multiple choice",
  select: "Dropdown",
  checkbox: "Checkboxes",
  yes_no: "Yes / No",
  scale: "Linear scale",
  file: "File upload",
};

export const CHOICE_TYPES: FieldType[] = ["radio", "select", "checkbox"];

export function isChoice(type: FieldType): boolean {
  return CHOICE_TYPES.includes(type);
}

/** A random id matching ^[a-z0-9]{6,24}$. */
export function newId(): string {
  let id = "";
  while (id.length < 10) id += Math.random().toString(36).slice(2);
  return id.slice(0, 10);
}

/** Stored answer as shown to people, as returned by the backend. */
export interface AnswerSnapshot {
  field_id: string;
  type: FieldType;
  label: string;
  section: string | null;
  display: string;
}

export interface BookingFile {
  id: number;
  field_id: string;
  name: string;
  mime: string;
  size: number;
  url: string;
  is_image: boolean;
}
