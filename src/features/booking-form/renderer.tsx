"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { FileText, ImagePlus, Receipt, X } from "lucide-react";
import { Input, inputClass, Textarea } from "@/components/ui/field";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/cn";
import { acceptAttribute, acceptLabel, acceptsFile, answersErrorMap, fileCounts, fileSize, isImageFile, keptFiles, MAX_FILE_BYTES, maxFilesOf } from "./files";
import { visibleFields } from "./logic";
import { OTHER, otherKey, type AnswerValue, type Answers, type BookingFile, type FormField, type FormSchema } from "./schema";

export { answersErrorMap };

export interface FormRendererProps {
  form: FormSchema;
  answers: Answers;
  onAnswers: (next: Answers) => void;
  /** New uploads per file question id. */
  files: Record<string, File[]>;
  onFiles: (next: Record<string, File[]>) => void;
  /** Already-uploaded files when editing. */
  existingFiles?: BookingFile[];
  removedFileIds?: number[];
  onRemovedFileIds?: (ids: number[]) => void;
  /** Error message per field id (`<id>` or `<id>__other`); see answersErrorMap. */
  errors?: Record<string, string>;
  disabled?: boolean;
  /** Builder preview: inputs work but nothing uploads; file pickers can still select locally. */
  preview?: boolean;
}

/**
 * A category's custom questions, filled in by a visitor. Visibility follows
 * logic.ts live, so a question whose condition stops holding disappears at
 * once (its answer stays in state but `pruneAnswers` drops it on submit).
 */
export function FormRenderer({
  form,
  answers,
  onAnswers,
  files,
  onFiles,
  existingFiles = [],
  removedFileIds = [],
  onRemovedFileIds,
  errors = {},
  disabled,
  preview,
}: FormRendererProps) {
  const visible = visibleFields(form, answers, fileCounts(form, files, existingFiles, removedFileIds));
  const kept = keptFiles(existingFiles, removedFileIds);
  const shown = form.fields.filter((field) => visible.has(field.id));

  const setAnswer = (key: string, value: AnswerValue) => onAnswers({ ...answers, [key]: value });

  if (shown.length === 0) return <></>;

  return (
    <div className="space-y-6">
      {shown.map((field, index) =>
        field.type === "section" ? (
          <SectionHeading key={field.id} field={field} first={index === 0} />
        ) : (
          <Question key={field.id} field={field} error={errors[field.id]}>
            {(id, describedBy) => (
              <Control
                field={field}
                id={id}
                describedBy={describedBy}
                answers={answers}
                setAnswer={setAnswer}
                error={errors[field.id]}
                otherError={errors[otherKey(field.id)]}
                disabled={disabled}
                preview={preview}
                files={files[field.id] ?? []}
                onFiles={(next) => onFiles({ ...files, [field.id]: next })}
                existing={kept.filter((file) => file.field_id === field.id)}
                onRemoveExisting={onRemovedFileIds ? (fileId) => onRemovedFileIds([...removedFileIds, fileId]) : undefined}
              />
            )}
          </Question>
        ),
      )}
    </div>
  );
}

function SectionHeading({ field, first }: { field: FormField; first: boolean }) {
  if (!field.label && !field.help) return first ? null : <hr className="border-rule" />;
  return (
    <div className={cn(!first && "border-t border-rule pt-6")}>
      {field.label && <h3 className="text-section font-semibold tracking-[-0.01em] text-ink">{field.label}</h3>}
      {field.help && <p className="mt-1 whitespace-pre-line text-[13px] leading-5 text-muted">{field.help}</p>}
    </div>
  );
}

/** Label (with the required mark), help, the control, then the error. */
function Question({ field, error, children }: { field: FormField; error?: string; children: (id: string, describedBy?: string) => ReactNode }) {
  const id = useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const grouped = field.type === "radio" || field.type === "checkbox" || field.type === "yes_no" || field.type === "scale" || field.type === "file";
  const describedBy = [field.help ? helpId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  const Title = grouped ? "p" : "label";

  return (
    <div data-question={field.id}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Title {...(grouped ? { id: `${id}-label` } : { htmlFor: id })} className="text-sm font-medium text-ink">
          {field.label || "Untitled question"}
          {field.required && (
            <>
              <span className="ms-0.5 text-negative" aria-hidden="true">
                *
              </span>
              <span className="sr-only"> (required)</span>
            </>
          )}
        </Title>
        {field.type === "file" && field.is_payment_proof && (
          <Pill tone="warning">
            <Receipt className="size-3" aria-hidden="true" />
            Payment proof
          </Pill>
        )}
      </div>
      {field.help && (
        <p id={helpId} className="mt-1 whitespace-pre-line text-[13px] leading-5 text-muted">
          {field.help}
        </p>
      )}
      <div className="mt-2.5" role={grouped ? "group" : undefined} aria-labelledby={grouped ? `${id}-label` : undefined}>
        {children(id, describedBy)}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-[13px] text-negative">
          {error}
        </p>
      )}
    </div>
  );
}

interface ControlProps {
  field: FormField;
  id: string;
  describedBy?: string;
  answers: Answers;
  setAnswer: (key: string, value: AnswerValue) => void;
  error?: string;
  otherError?: string;
  disabled?: boolean;
  preview?: boolean;
  files: File[];
  onFiles: (next: File[]) => void;
  existing: BookingFile[];
  onRemoveExisting?: (fileId: number) => void;
}

function Control(props: ControlProps) {
  const { field, id, describedBy, answers, setAnswer, error, disabled } = props;
  const value = answers[field.id];
  const invalid = !!error || undefined;
  const text = typeof value === "string" ? value : typeof value === "number" ? String(value) : "";

  switch (field.type) {
    case "short_text":
    case "email":
    case "phone":
      return (
        <Input
          id={id}
          type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
          inputMode={field.type === "email" ? "email" : field.type === "phone" ? "tel" : undefined}
          autoComplete={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "off"}
          placeholder={field.placeholder ?? undefined}
          maxLength={field.type === "short_text" ? (field.max ?? 255) : 255}
          value={text}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-required={field.required || undefined}
          invalid={invalid}
          onChange={(event) => setAnswer(field.id, event.target.value)}
        />
      );
    case "paragraph":
      return (
        <Textarea
          id={id}
          rows={4}
          placeholder={field.placeholder ?? undefined}
          maxLength={field.max ?? 5000}
          value={text}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-required={field.required || undefined}
          invalid={invalid}
          onChange={(event) => setAnswer(field.id, event.target.value)}
        />
      );
    case "number":
      return (
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          className="sm:max-w-60"
          min={field.min ?? undefined}
          max={field.max ?? undefined}
          placeholder={field.placeholder ?? undefined}
          value={text}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-required={field.required || undefined}
          invalid={invalid}
          onChange={(event) => {
            const raw = event.target.value;
            const number = raw === "" ? null : Number(raw);
            setAnswer(field.id, number === null || Number.isNaN(number) ? null : number);
          }}
        />
      );
    case "date":
    case "time":
      return (
        <Input
          id={id}
          type={field.type}
          className="sm:max-w-60"
          value={text}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-required={field.required || undefined}
          invalid={invalid}
          onChange={(event) => setAnswer(field.id, event.target.value || null)}
        />
      );
    case "select":
      return (
        <select
          id={id}
          value={text}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-required={field.required || undefined}
          aria-invalid={invalid}
          onChange={(event) => setAnswer(field.id, event.target.value || null)}
          className={cn(inputClass, "appearance-auto pe-2", !text && "text-faint")}
        >
          <option value="">{field.placeholder || "Choose…"}</option>
          {(field.options ?? []).map((option) => (
            <option key={option.id} value={option.id} className="text-ink">
              {option.label}
            </option>
          ))}
        </select>
      );
    case "radio":
    case "checkbox":
      return <Choices {...props} />;
    case "yes_no":
      return (
        <ChipRow
          name={id}
          describedBy={describedBy}
          invalid={invalid}
          disabled={disabled}
          required={field.required}
          options={[
            { value: true, label: "Yes" },
            { value: false, label: "No" },
          ]}
          value={typeof value === "boolean" ? value : null}
          onChange={(next) => setAnswer(field.id, next)}
          chipClassName="min-w-20 px-4"
        />
      );
    case "scale": {
      const min = field.min === 0 ? 0 : 1;
      const max = Math.min(10, Math.max(2, field.max ?? 5));
      const steps = Array.from({ length: max - min + 1 }, (_, index) => min + index);
      return (
        // As wide as the chips at full size, shrinking them evenly on a phone so 0–10 stays on one line.
        <div style={{ maxWidth: `${steps.length * 2.75 + (steps.length - 1) * 0.375}rem` }}>
          <ChipRow
            columns={steps.length}
            name={id}
            describedBy={describedBy}
            invalid={invalid}
            disabled={disabled}
            required={field.required}
            options={steps.map((step) => ({ value: step, label: String(step) }))}
            value={typeof value === "number" ? value : null}
            onChange={(next) => setAnswer(field.id, next)}
            chipClassName="min-w-0 px-0 font-mono tabular"
          />
          {(field.min_label || field.max_label) && (
            <div className="mt-2 flex justify-between gap-4 text-xs text-faint">
              <span>
                {field.min_label && (
                  <>
                    <span className="font-mono tabular">{min}</span> · {field.min_label}
                  </>
                )}
              </span>
              <span className="text-end">
                {field.max_label && (
                  <>
                    {field.max_label} · <span className="font-mono tabular">{max}</span>
                  </>
                )}
              </span>
            </div>
          )}
        </div>
      );
    }
    case "file":
      return <FilePicker {...props} />;
    case "section":
      return null;
  }
}

/* --- Choices --------------------------------------------------------------- */

/** Radio or checkbox rows, each a bordered card; "Other" reveals its text input. */
function Choices({ field, id, describedBy, answers, setAnswer, error, otherError, disabled }: ControlProps) {
  const multiple = field.type === "checkbox";
  const value = answers[field.id];
  const selected: string[] = multiple ? (Array.isArray(value) ? value : []) : typeof value === "string" && value ? [value] : [];
  const options = [...(field.options ?? [])];
  if (field.allow_other) options.push({ id: OTHER, label: "Other" });
  const otherInput = useRef<HTMLInputElement>(null);
  const otherText = answers[otherKey(field.id)];

  const toggle = (optionId: string) => {
    if (multiple) {
      const next = selected.includes(optionId) ? selected.filter((item) => item !== optionId) : [...selected, optionId];
      // Keep the form's option order, whatever order they were clicked in.
      setAnswer(field.id, options.map((option) => option.id).filter((item) => next.includes(item)));
    } else {
      setAnswer(field.id, optionId);
    }
    if (optionId === OTHER && !selected.includes(OTHER)) requestAnimationFrame(() => otherInput.current?.focus());
  };

  const limit =
    multiple && (field.min || field.max)
      ? field.min && field.max
        ? field.min === field.max
          ? `Choose ${field.min}.`
          : `Choose ${field.min} to ${field.max}.`
        : field.min
          ? `Choose at least ${field.min}.`
          : `Choose up to ${field.max}.`
      : null;

  return (
    <div>
      {limit && <p className="-mt-1 mb-2 text-xs text-faint">{limit}</p>}
      <div className="grid gap-2">
        {options.map((option) => {
          const checked = selected.includes(option.id);
          const isOther = option.id === OTHER;
          return (
            <div
              key={option.id}
              className={cn(
                "rounded-control border bg-surface transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                checked ? "border-ink" : error ? "border-negative" : "border-line hover:border-control",
                disabled && "opacity-60",
              )}
            >
              <label className={cn("relative flex min-h-11 items-center gap-3 px-3.5 py-2.5 text-sm text-ink", disabled ? "cursor-not-allowed" : "cursor-pointer")}>
                <input
                  type={multiple ? "checkbox" : "radio"}
                  name={id}
                  value={option.id}
                  checked={checked}
                  disabled={disabled}
                  aria-describedby={describedBy}
                  aria-invalid={error ? true : undefined}
                  onChange={() => toggle(option.id)}
                  className="sr-only"
                />
                <Mark multiple={multiple} checked={checked} />
                <span className="min-w-0 break-words">{option.label}</span>
              </label>
              {isOther && checked && (
                <div className="px-3.5 pb-3 ps-11">
                  <input
                    ref={otherInput}
                    className={inputClass}
                    aria-label={`${field.label || "Question"}: other`}
                    placeholder="Type your answer"
                    maxLength={255}
                    value={typeof otherText === "string" ? otherText : ""}
                    disabled={disabled}
                    aria-invalid={otherError ? true : undefined}
                    onChange={(event) => setAnswer(otherKey(field.id), event.target.value)}
                  />
                  {otherError && (
                    <p role="alert" className="mt-1.5 text-[13px] text-negative">
                      {otherError}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!multiple && !field.required && selected.length > 0 && !disabled && (
        <button type="button" onClick={() => setAnswer(field.id, null)} className="mt-2 text-xs font-medium text-muted underline-offset-4 hover:text-ink hover:underline">
          Clear selection
        </button>
      )}
    </div>
  );
}

/** The round (radio) or square (checkbox) mark; selection changes its colour, never its border width. */
function Mark({ multiple, checked }: { multiple: boolean; checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-[18px] shrink-0 items-center justify-center border transition-colors",
        multiple ? "rounded-[5px]" : "rounded-full",
        checked ? "border-ink bg-ink" : "border-control bg-surface",
      )}
    >
      {checked &&
        (multiple ? (
          <svg viewBox="0 0 12 12" className="size-3 text-ground" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 6.2 5 8.5l4.5-5" />
          </svg>
        ) : (
          <span className="size-1.5 rounded-full bg-ground" />
        ))}
    </span>
  );
}

/** Yes / No and the scale: one-tap chips, backed by real radios for the keyboard. */
function ChipRow<T extends string | number | boolean>({
  name,
  options,
  value,
  onChange,
  describedBy,
  invalid,
  disabled,
  required,
  chipClassName,
  columns,
}: {
  /** Lay the chips out as equal columns that shrink to fit, instead of wrapping. */
  columns?: number;
  name: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (next: T | null) => void;
  describedBy?: string;
  invalid?: boolean;
  disabled?: boolean;
  required?: boolean;
  chipClassName?: string;
}) {
  return (
    <div
      className={columns ? "grid gap-1 sm:gap-1.5" : "flex flex-wrap gap-1.5"}
      style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
    >
      {options.map((option) => {
        const checked = value === option.value;
        return (
          <label
            key={String(option.value)}
            className={cn(
              "relative inline-flex h-10 items-center justify-center rounded-control border text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
              checked ? "border-ink bg-ink text-ground" : invalid ? "border-negative bg-surface text-ink" : "border-line bg-surface text-ink hover:bg-raised",
              disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
              chipClassName,
            )}
          >
            <input
              type="radio"
              name={name}
              checked={checked}
              disabled={disabled}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              onChange={() => onChange(option.value)}
              // A second tap on the chosen chip clears an optional answer.
              onClick={() => {
                if (checked && !required) onChange(null);
              }}
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

/* --- Files ----------------------------------------------------------------- */

function FilePicker({ field, id, describedBy, error, disabled, preview, files, onFiles, existing, onRemoveExisting }: ControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const max = maxFilesOf(field);
  const count = existing.length + files.length;
  const room = max - count;
  const full = room <= 0;

  function add(picked: FileList | File[] | null) {
    if (!picked) return;
    const list = Array.from(picked);
    if (list.length === 0) return;
    const issues: string[] = [];
    const accepted: File[] = [];
    for (const file of list) {
      if (!acceptsFile(field, file)) issues.push(`${file.name} isn't a ${acceptLabel(field)} file.`);
      else if (file.size > MAX_FILE_BYTES) issues.push(`${file.name} is over 10 MB.`);
      else accepted.push(file);
    }
    const fitting = accepted.slice(0, Math.max(0, room));
    if (accepted.length > fitting.length) issues.push(max === 1 ? "Only one file can be added here." : `Up to ${max} files can be added here.`);
    setProblem(issues[0] ?? null);
    if (fitting.length) onFiles([...files, ...fitting]);
  }

  const shownError = problem ?? error;

  return (
    <div>
      {!full && (
        <div
          onDragOver={(event) => {
            if (disabled) return;
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (!disabled) add(event.dataTransfer.files);
          }}
        >
          <button
            type="button"
            id={id}
            disabled={disabled}
            aria-describedby={describedBy}
            aria-invalid={shownError ? true : undefined}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-1.5 rounded-control border border-dashed px-4 py-6 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              dragging ? "border-ink bg-raised" : shownError ? "border-negative bg-surface hover:bg-raised" : "border-control bg-surface hover:bg-raised",
            )}
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-raised text-muted">
              <ImagePlus className="size-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-medium text-ink">{count > 0 ? "Add another file" : "Choose a file or drop it here"}</span>
            <span className="text-xs text-faint">
              {acceptLabel(field)} · up to 10 MB{max > 1 ? ` · ${count} of ${max} added` : ""}
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            tabIndex={-1}
            hidden
            accept={acceptAttribute(field)}
            multiple={room > 1}
            onChange={(event) => {
              add(event.target.files);
              event.target.value = "";
            }}
          />
        </div>
      )}

      {count > 0 && (
        <ul className={cn("flex flex-wrap gap-2", !full && "mt-3")} aria-label="Files">
          {existing.map((file) => (
            <FileTile
              key={`e${file.id}`}
              name={file.name}
              size={file.size}
              image={file.is_image}
              src={file.is_image ? file.url : null}
              href={file.url}
              disabled={disabled || !onRemoveExisting}
              onRemove={() => {
                setProblem(null);
                onRemoveExisting?.(file.id);
              }}
            />
          ))}
          {files.map((file, index) => (
            <NewFileTile
              key={`n${index}-${file.name}-${file.size}-${file.lastModified}`}
              file={file}
              disabled={disabled}
              onRemove={() => {
                setProblem(null);
                onFiles(files.filter((_, at) => at !== index));
              }}
            />
          ))}
        </ul>
      )}

      {full && max > 1 && <p className="mt-2 text-xs text-faint">{max} of {max} files added. Remove one to add another.</p>}
      {preview && <p className="mt-2 text-xs text-faint">Preview: files stay on this device.</p>}
      {problem && (
        <p role="alert" className="mt-1.5 text-[13px] text-negative">
          {problem}
        </p>
      )}
    </div>
  );
}

/** A freshly picked file; images get an object-URL thumbnail, revoked when it goes away. */
function NewFileTile({ file, disabled, onRemove }: { file: File; disabled?: boolean; onRemove: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  const image = isImageFile(file);

  useEffect(() => {
    if (!image) return;
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file, image]);

  return <FileTile name={file.name} size={file.size} image={image} src={src} disabled={disabled} onRemove={onRemove} />;
}

function FileTile({
  name,
  size,
  image: isImage,
  src,
  href,
  disabled,
  onRemove,
}: {
  name: string;
  size: number;
  image: boolean;
  src: string | null;
  href?: string;
  disabled?: boolean;
  onRemove: () => void;
}) {
  const remove = !disabled && (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove ${name}`}
      className="absolute end-1 top-1 flex size-6 items-center justify-center rounded-full bg-ink/80 text-ground transition-colors hover:bg-ink"
    >
      <X className="size-3.5" aria-hidden="true" />
    </button>
  );

  if (isImage) {
    const image = src ? <img src={src} alt={name} className="size-full object-cover" /> : <span className="block size-full animate-pulse bg-raised" />;
    return (
      <li className="relative size-24 overflow-hidden border border-line bg-raised" title={name}>
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="block size-full">
            {image}
          </a>
        ) : (
          image
        )}
        {remove}
      </li>
    );
  }

  return (
    <li className="relative flex h-24 w-full max-w-64 items-center gap-3 rounded-control border border-line bg-surface pe-9 ps-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-raised text-muted">
        <FileText className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="block truncate text-[13px] font-medium text-ink hover:underline">
            {name}
          </a>
        ) : (
          <span className="block truncate text-[13px] font-medium text-ink">{name}</span>
        )}
        <span className="block font-mono text-[11px] text-faint tabular">{fileSize(size)}</span>
      </span>
      {remove}
    </li>
  );
}
