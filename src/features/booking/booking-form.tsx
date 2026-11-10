"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Receipt, Send } from "lucide-react";
import { useConfirm } from "@/components/ui/feedback";
import { Field, Input, inputClass, Textarea } from "@/components/ui/field";
import { ApiError, type FieldErrors } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useForm } from "@/lib/use-form";
import { ActionButton, Note } from "@/features/gallery/gallery-chrome";
import { answersErrorMap, fileCounts, hasNewFiles, keptFiles, paymentProofField } from "@/features/booking-form/files";
import { isEmptyValue, pruneAnswers, visibleFields } from "@/features/booking-form/logic";
import { FormRenderer } from "@/features/booking-form/renderer";
import { OTHER, otherKey, type Answers, type FormSchema } from "@/features/booking-form/schema";
import { Deck, OptionalTag } from "./booking-parts";
import type { BookingCategory, BookingInfo, BookingPayload, PublicBookingRequest } from "./types";
import { createBooking, lookupKey, storeEmail, updateBooking } from "./use-booking";

type Values = {
  name: string;
  email: string;
  phone: string;
  shoot_date: string;
  shoot_time: string;
  location: string;
  category_id: number | "";
  notes: string;
};

function valuesFrom(request?: PublicBookingRequest | null): Values {
  return {
    name: request?.name ?? "",
    email: request?.email ?? "",
    phone: request?.phone ?? "",
    shoot_date: request?.shoot_date ?? "",
    shoot_time: request?.shoot_time?.slice(0, 5) ?? "",
    location: request?.location ?? "",
    category_id: request?.category_id ?? "",
    notes: request?.notes ?? "",
  };
}

/** What the API takes: blanks as null, times as "HH:MM". */
function payloadFrom(values: Values): BookingPayload {
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim() || null,
    category_id: values.category_id === "" ? null : values.category_id,
    shoot_date: values.shoot_date,
    shoot_time: values.shoot_time ? values.shoot_time.slice(0, 5) : null,
    location: values.location.trim(),
    notes: values.notes.trim() || null,
  };
}

/** Whether the custom questions hold something worth confirming before a category switch throws it away. */
function formHasInput(form: FormSchema | undefined, answers: Answers, files: Record<string, File[]>, kept: number): boolean {
  if (!form) return false;
  return Object.keys(pruneAnswers(form, answers)).length > 0 || hasNewFiles(files) || kept > 0;
}

/**
 * Required questions left empty, keyed like the API's 422 (`answers.<id>`,
 * `files.<id>`), so a big upload isn't sent only to be refused.
 */
function missingAnswers(form: FormSchema, answers: Answers, counts: Record<string, number>): FieldErrors {
  const visible = visibleFields(form, answers, counts);
  const errors: FieldErrors = {};
  for (const field of form.fields) {
    if (field.type === "section" || !visible.has(field.id)) continue;
    if (field.type === "file") {
      if (field.required && (counts[field.id] ?? 0) === 0) errors[`files.${field.id}`] = ["Add a file."];
      continue;
    }
    const value = answers[field.id];
    if (field.required && isEmptyValue(value)) {
      errors[`answers.${field.id}`] = ["This question is required."];
      continue;
    }
    const chose = Array.isArray(value) ? value.includes(OTHER) : value === OTHER;
    if (field.allow_other && chose && isEmptyValue(answers[otherKey(field.id)])) errors[`answers.${otherKey(field.id)}`] = ["Type your answer for Other."];
  }
  return errors;
}

const ANSWER_ERROR = /^(answers|files|remove_files)(\.|$)/;

/**
 * The request form. Without `request` it sends a new booking (POST); with one
 * it edits that pending booking (PATCH), the email shown but locked, since
 * the email is what proves it's theirs. Once a category is picked, its own
 * questions show under the base fields.
 */
export function BookingForm({
  token,
  info,
  request,
  onSaved,
  onCancel,
}: {
  token: string;
  info: BookingInfo;
  request?: PublicBookingRequest | null;
  onSaved: (request: PublicBookingRequest) => void;
  onCancel?: () => void;
}) {
  const client = useQueryClient();
  const confirm = useConfirm();
  const form = useForm<Values>(valuesFrom(request));
  const { values, set, error } = form;
  // The category's own questions: raw answers, new picks per file question, and existing files to drop.
  const [answers, setAnswers] = useState<Answers>(() => request?.answers ?? {});
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [removed, setRemoved] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const editing = !!request;
  const existing = request?.files ?? [];
  const studio = info.studio.name;
  const hasCategories = info.categories.length > 0;
  const category: BookingCategory | undefined = info.categories.find((item) => item.id === values.category_id);
  // Defensive: an older API without forms just shows no extra questions.
  const custom = category?.form?.fields?.length ? category.form : undefined;
  const proof = paymentProofField(custom);
  const answerErrors = answersErrorMap(form.errors);

  // After a refused submit, take the visitor to the first field to fix (or the form's message).
  useEffect(() => {
    if (!attempt) return;
    const target = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-form-error]');
    target?.focus({ preventScroll: true });
    (target?.closest<HTMLElement>("[data-question]") ?? target)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [attempt]);

  /** Drops the errors of the answers that just changed, as `set` does for the base fields. */
  function clearAnswerErrors(keys: string[]) {
    if (keys.length === 0) return;
    form.setErrors((current) => {
      const prefixes = keys.flatMap((key) => [`answers.${key}`, `files.${key}`]);
      const stale = Object.keys(current).filter((name) => prefixes.some((prefix) => name === prefix || name.startsWith(`${prefix}.`)));
      if (stale.length === 0) return current;
      const next = { ...current };
      for (const name of stale) delete next[name];
      return next;
    });
  }

  function changeAnswers(next: Answers) {
    const keys = [...new Set([...Object.keys(next), ...Object.keys(answers)])].filter((key) => next[key] !== answers[key]);
    setAnswers(next);
    clearAnswerErrors(keys);
  }

  function changeFiles(next: Record<string, File[]>) {
    setFiles(next);
    clearAnswerErrors(Object.keys(next).filter((key) => next[key] !== files[key]));
  }

  function changeRemoved(next: number[]) {
    setRemoved(next);
    clearAnswerErrors(existing.filter((file) => next.includes(file.id) && !removed.includes(file.id)).map((file) => file.field_id));
  }

  /** A different category means a different form: its answers and files go, after a confirm. */
  async function changeCategory(next: number | "") {
    if (next === values.category_id) return;
    const kept = keptFiles(existing, removed).length;
    if (category && formHasInput(custom, answers, files, kept)) {
      const ok = await confirm({
        title: "Change the category?",
        message: `Your answers to the ${category.name} questions${hasNewFiles(files) || kept > 0 ? " and your files" : ""} will be cleared.`,
        confirmLabel: "Change category",
        tone: "danger",
      });
      if (!ok) return;
    }
    set("category_id", next);
    setAnswers({});
    setFiles({});
    setRemoved(existing.map((file) => file.id));
    form.setErrors((current) => Object.fromEntries(Object.entries(current).filter(([name]) => !ANSWER_ERROR.test(name))));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const counts = custom ? fileCounts(custom, files, existing, removed) : {};
    const missing = custom ? missingAnswers(custom, answers, counts) : {};
    if (Object.keys(missing).length > 0) {
      form.setErrors((current) => ({ ...current, ...missing }));
      setAttempt((count) => count + 1);
      return;
    }
    setBusy(true);
    try {
      const visible = custom ? visibleFields(custom, answers, counts) : new Set<string>();
      const payload: BookingPayload = { ...payloadFrom(values), answers: custom ? pruneAnswers(custom, answers, counts) : {} };
      // Only the uploads of questions still showing go along.
      const uploads = {
        files: Object.fromEntries(Object.entries(files).filter(([id, list]) => visible.has(id) && list.length > 0)),
        remove: removed.filter((id) => existing.some((file) => file.id === id)),
      };
      const result = request
        ? await updateBooking(token, request.id, { ...payload, email: request.email }, uploads)
        : await createBooking(token, payload, uploads);
      storeEmail(token, result.request.email);
      void client.invalidateQueries({ queryKey: lookupKey(token) });
      onSaved(result.request);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404 && editing) {
        form.setErrors({ form: ["We couldn't find this booking any more. Look up your bookings again and retry."] });
      } else if (caught instanceof ApiError && caught.status === 429) {
        form.setErrors({ form: ["Too many attempts. Please wait a minute and try again."] });
      } else if (caught instanceof ApiError && caught.status === 413) {
        form.setErrors({ form: ["Those files are too large to send together. Try fewer or smaller files."] });
      } else {
        try {
          form.capture(caught, "form");
        } catch {
          form.setErrors({ form: ["We couldn't reach the studio. Check your connection and try again."] });
        }
      }
      setAttempt((count) => count + 1);
    } finally {
      setBusy(false);
    }
  }

  // Errors the renderer can't place on a question still need saying.
  const formError = error("form") ?? error("answers") ?? error("files") ?? error("remove_files");

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="space-y-4">
      <Deck title="Your details" text={editing ? "Update how the studio can reach you." : `So ${studio} knows who's asking and how to reach you.`}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" error={error("name")} className="sm:col-span-2">
            {(id) => (
              <Input
                id={id}
                autoComplete="name"
                required
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                invalid={!!error("name")}
              />
            )}
          </Field>
          <Field
            label="Email"
            error={error("email")}
            hint={editing ? "Your email can't be changed: it's how we find your booking." : "We'll use this email to find and edit your booking later"}
          >
            {(id) => (
              <Input
                id={id}
                type="email"
                inputMode="email"
                autoComplete="email"
                required={!editing}
                readOnly={editing}
                aria-readonly={editing || undefined}
                className="read-only:bg-raised read-only:text-muted read-only:hover:border-control"
                value={values.email}
                onChange={(e) => set("email", e.target.value)}
                invalid={!!error("email")}
              />
            )}
          </Field>
          <Field label="Phone" aside={<OptionalTag />} error={error("phone")}>
            {(id) => (
              <Input id={id} type="tel" inputMode="tel" autoComplete="tel" value={values.phone} onChange={(e) => set("phone", e.target.value)} invalid={!!error("phone")} />
            )}
          </Field>
        </div>
      </Deck>

      <Deck title="The shoot" text="When and where. You can leave the time open if you're not sure yet.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Shoot date" error={error("shoot_date")}>
            {(id) => (
              <Input
                id={id}
                type="date"
                required
                min={info.today}
                value={values.shoot_date}
                onChange={(e) => set("shoot_date", e.target.value)}
                invalid={!!error("shoot_date")}
              />
            )}
          </Field>
          <Field label="Time" aside={<OptionalTag />} error={error("shoot_time")}>
            {(id) => <Input id={id} type="time" value={values.shoot_time} onChange={(e) => set("shoot_time", e.target.value)} invalid={!!error("shoot_time")} />}
          </Field>
          <Field label="Location" error={error("location")} className="sm:col-span-2">
            {(id) => (
              <Input
                id={id}
                required
                placeholder="Venue, address or city"
                value={values.location}
                onChange={(e) => set("location", e.target.value)}
                invalid={!!error("location")}
              />
            )}
          </Field>
          {hasCategories && (
            <Field label="Category" error={error("category_id")} className="sm:col-span-2">
              {(id) => (
                <select
                  id={id}
                  required
                  value={values.category_id === "" ? "" : String(values.category_id)}
                  onChange={(e) => void changeCategory(e.target.value === "" ? "" : Number(e.target.value))}
                  aria-invalid={!!error("category_id") || undefined}
                  className={cn(inputClass, "appearance-auto pe-2", values.category_id === "" && "text-faint")}
                >
                  <option value="" disabled>
                    Choose a category
                  </option>
                  {info.categories.map((item) => (
                    <option key={item.id} value={item.id} className="text-ink">
                      {item.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          )}
          <Field label="Notes" aside={<OptionalTag />} error={error("notes")} className="sm:col-span-2">
            {(id) => (
              <Textarea
                id={id}
                rows={4}
                maxLength={2000}
                placeholder={`Anything ${studio} should know: the occasion, how many people, ideas…`}
                value={values.notes}
                onChange={(e) => set("notes", e.target.value)}
                invalid={!!error("notes")}
              />
            )}
          </Field>
        </div>
      </Deck>

      {category && custom && (
        <Deck title={`${category.name} details`} text={`A few more questions from ${studio} for this kind of shoot.`}>
          {proof && (
            <div className="mb-6 flex items-start gap-3 rounded-control bg-status-selection-soft px-3.5 py-3 text-[13px] leading-5 text-status-selection">
              <Receipt className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>
                <span className="font-semibold">A {category.deposit_percent}% down payment is required.</span>{" "}
                {proof.label ? `Add your proof of payment under “${proof.label}”.` : "Add your proof of payment below."}
              </p>
            </div>
          )}
          <FormRenderer
            form={custom}
            answers={answers}
            onAnswers={changeAnswers}
            files={files}
            onFiles={changeFiles}
            existingFiles={existing}
            removedFileIds={removed}
            onRemovedFileIds={changeRemoved}
            errors={answerErrors}
            disabled={busy}
          />
        </Deck>
      )}

      {formError && (
        <div tabIndex={-1} data-form-error className="outline-none">
          <Note tone="negative">{formError}</Note>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        {onCancel && (
          <ActionButton variant="secondary" onClick={onCancel} disabled={busy} className="w-full sm:w-auto">
            Cancel
          </ActionButton>
        )}
        <ActionButton
          type="submit"
          loading={busy}
          icon={editing ? <CalendarCheck className="size-4" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
          className="w-full sm:w-auto"
        >
          {editing ? "Save changes" : "Send request"}
        </ActionButton>
      </div>
    </form>
  );
}
