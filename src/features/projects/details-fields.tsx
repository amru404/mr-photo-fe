"use client";

import { Field, Input, inputClass, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import type { ClientOption, ClientRef, Options } from "@/lib/types";
import { ClientPicker } from "@/features/clients/client-picker";

export type DetailValues = {
  title: string;
  client_id: number | "";
  category_id: number | "";
  shoot_date: string;
  shoot_time: string;
  location: string;
  notes: string;
};

/** Form values for a project's details, from what the API returned. */
export function detailValues(project?: {
  title: string;
  client: ClientRef | null;
  category_id: number | null;
  shoot_date: string | null;
  shoot_time: string | null;
  location: string | null;
  notes: string | null;
}): DetailValues {
  return {
    title: project?.title ?? "",
    client_id: project?.client?.id ?? "",
    category_id: project?.category_id ?? "",
    shoot_date: project?.shoot_date ?? "",
    shoot_time: project?.shoot_time?.slice(0, 5) ?? "",
    location: project?.location ?? "",
    notes: project?.notes ?? "",
  };
}

/** The step-1 fields as the API takes them: ids or null, blanks as null. */
export function detailPayload(values: DetailValues) {
  return {
    title: values.title,
    client_id: values.client_id === "" ? null : values.client_id,
    category_id: values.category_id === "" ? null : values.category_id,
    shoot_date: values.shoot_date,
    shoot_time: values.shoot_time ? values.shoot_time.slice(0, 5) : null,
    location: values.location.trim() || null,
    notes: values.notes.trim() || null,
  };
}

/** The details step, shared by the wizard and the "Edit details" dialog. */
export function DetailsFields({
  values,
  set,
  error,
  categories,
  client,
  onClient,
  autoFocus,
}: {
  values: DetailValues;
  set: <K extends keyof DetailValues>(key: K, value: DetailValues[K]) => void;
  error: (key: string) => string | undefined;
  categories: Options["categories"];
  /** The saved client, shown until the picker's list has loaded. */
  client?: ClientRef | null;
  onClient?: (client: ClientOption | null) => void;
  autoFocus?: boolean;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Project title" error={error("title")} className="sm:col-span-2">
        {(id) => (
          <Input id={id} autoFocus={autoFocus} placeholder="e.g. Sarah & James Wedding" value={values.title} onChange={(e) => set("title", e.target.value)} invalid={!!error("title")} />
        )}
      </Field>
      <Field label="Client" error={error("client_id")} className="sm:col-span-2">
        {(id) => (
          <ClientPicker
            id={id}
            value={values.client_id}
            fallback={client}
            invalid={!!error("client_id")}
            onChange={(clientId, option) => {
              set("client_id", clientId);
              onClient?.(option);
            }}
          />
        )}
      </Field>
      <Field label="Shoot date" error={error("shoot_date")}>
        {(id) => <Input id={id} type="date" required value={values.shoot_date} onChange={(e) => set("shoot_date", e.target.value)} invalid={!!error("shoot_date")} />}
      </Field>
      <Field label="Start time" hint="Optional" error={error("shoot_time")}>
        {(id) => <Input id={id} type="time" value={values.shoot_time} onChange={(e) => set("shoot_time", e.target.value)} invalid={!!error("shoot_time")} />}
      </Field>
      <Field label="Location" error={error("location")}>
        {(id) => (
          <Input id={id} placeholder="Optional — venue or address" value={values.location} onChange={(e) => set("location", e.target.value)} invalid={!!error("location")} />
        )}
      </Field>
      <Field label="Category" error={error("category_id")}>
        {(id) => (
          <select
            id={id}
            value={values.category_id === "" ? "" : String(values.category_id)}
            onChange={(e) => set("category_id", e.target.value === "" ? "" : Number(e.target.value))}
            aria-invalid={!!error("category_id") || undefined}
            className={cn(inputClass, "appearance-auto pe-2", values.category_id === "" && "text-faint")}
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id} className="text-ink">
                {category.name}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Notes" error={error("notes")} className="sm:col-span-2">
        {(id) => (
          <Textarea
            id={id}
            rows={3}
            placeholder="Optional — schedule, contacts on the day, shot list…"
            value={values.notes}
            onChange={(e) => set("notes", e.target.value)}
            invalid={!!error("notes")}
          />
        )}
      </Field>
    </div>
  );
}
