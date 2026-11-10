/**
 * Helpers around a form's file questions and its API errors, shared by the
 * renderer, the public booking form and the photographer's views.
 */
import { ApiError, type FieldErrors } from "@/lib/api";
import type { BookingFile, FormField, FormSchema } from "./schema";

/** The backend's per-file limit. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

/** The `accept` attribute for a file question's picker. */
export function acceptAttribute(field: Pick<FormField, "accept">): string {
  const types = [...IMAGE_TYPES, ...IMAGE_EXTENSIONS.map((ext) => `.${ext}`)];
  if (field.accept === "image_pdf") types.push("application/pdf", ".pdf");
  return types.join(",");
}

/** Whether a picked file is a type this question takes (by MIME, falling back to the extension). */
export function acceptsFile(field: Pick<FormField, "accept">, file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (IMAGE_TYPES.includes(file.type) || (!file.type && IMAGE_EXTENSIONS.includes(ext))) return true;
  if (field.accept === "image_pdf") return file.type === "application/pdf" || (!file.type && ext === "pdf");
  return false;
}

/** "JPG, PNG or WebP", plus PDF when the question takes it. */
export function acceptLabel(field: Pick<FormField, "accept">): string {
  return field.accept === "image_pdf" ? "JPG, PNG, WebP or PDF" : "JPG, PNG or WebP";
}

export function maxFilesOf(field: Pick<FormField, "max_files">): number {
  return Math.min(5, Math.max(1, field.max_files ?? 1));
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(file.name);
}

/** "2.4 MB", "830 KB". */
export function fileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Existing files still kept (not marked for removal). */
export function keptFiles(existing: BookingFile[] = [], removed: number[] = []): BookingFile[] {
  return existing.filter((file) => !removed.includes(file.id));
}

/** Files per file question: kept existing plus new picks, for `visibleFields` / `pruneAnswers`. */
export function fileCounts(form: FormSchema, files: Record<string, File[]>, existing: BookingFile[] = [], removed: number[] = []): Record<string, number> {
  const kept = keptFiles(existing, removed);
  const counts: Record<string, number> = {};
  for (const field of form.fields) {
    if (field.type !== "file") continue;
    counts[field.id] = kept.filter((file) => file.field_id === field.id).length + (files[field.id]?.length ?? 0);
  }
  return counts;
}

/** The form's payment-proof question, if it has one. */
export function paymentProofField(form: FormSchema | null | undefined): FormField | undefined {
  return form?.fields.find((field) => field.type === "file" && field.is_payment_proof);
}

/** Whether any new file was picked. */
export function hasNewFiles(files: Record<string, File[]>): boolean {
  return Object.values(files).some((list) => list.length > 0);
}

/**
 * A 422's errors in the renderer's shape: `answers.<id>` → `<id>`,
 * `answers.<id>__other` → `<id>__other`, `answers.<id>.0` and `files.<id>.0`
 * → `<id>`. First message per key wins. Takes an ApiError or its `errors`.
 */
export function answersErrorMap(source: unknown): Record<string, string> {
  const errors: FieldErrors | undefined = source instanceof ApiError ? source.errors : isFieldErrors(source) ? source : undefined;
  const out: Record<string, string> = {};
  if (!errors) return out;
  for (const [key, messages] of Object.entries(errors)) {
    const match = /^(answers|files)\.([a-z0-9]+(?:__other)?)(?:\..*)?$/.exec(key);
    if (!match || !messages?.[0]) continue;
    out[match[2]] ??= tidyMessage(messages[0]);
  }
  return out;
}

/** Laravel says "The answers.abc123 field is required."; the question's label is already above it. */
function tidyMessage(message: string): string {
  return message.replace(/(the )?(answers|files)\.[a-z0-9_.]+( field)?/i, "this question").replace(/^this/, "This");
}

function isFieldErrors(value: unknown): value is FieldErrors {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
