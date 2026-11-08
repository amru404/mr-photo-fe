"use client";

import { useId } from "react";
import { Field, Input } from "@/components/ui/field";

export interface DetailValues {
  title: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  shoot_date: string;
  category: string;
}

/** The details step, shared by the wizard and the "Edit details" dialog. */
export function DetailsFields({
  values,
  set,
  error,
  categories,
  autoFocus,
}: {
  values: DetailValues;
  set: <K extends keyof DetailValues>(key: K, value: DetailValues[K]) => void;
  error: (key: string) => string | undefined;
  categories: string[];
  autoFocus?: boolean;
}) {
  const listId = useId();
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Project title" error={error("title")} className="sm:col-span-2">
        {(id) => (
          <Input id={id} autoFocus={autoFocus} placeholder="e.g. Sarah & James Wedding" value={values.title} onChange={(e) => set("title", e.target.value)} invalid={!!error("title")} />
        )}
      </Field>
      <Field label="Client name" error={error("client_name")}>
        {(id) => <Input id={id} value={values.client_name} onChange={(e) => set("client_name", e.target.value)} invalid={!!error("client_name")} />}
      </Field>
      <Field label="Client email" error={error("client_email")}>
        {(id) => (
          <Input id={id} type="email" placeholder="Optional" value={values.client_email} onChange={(e) => set("client_email", e.target.value)} invalid={!!error("client_email")} />
        )}
      </Field>
      <Field label="Client phone / WhatsApp" error={error("client_phone")}>
        {(id) => (
          <Input id={id} type="tel" placeholder="Optional" value={values.client_phone} onChange={(e) => set("client_phone", e.target.value)} invalid={!!error("client_phone")} />
        )}
      </Field>
      <Field label="Shoot date" error={error("shoot_date")}>
        {(id) => <Input id={id} type="date" value={values.shoot_date} onChange={(e) => set("shoot_date", e.target.value)} invalid={!!error("shoot_date")} />}
      </Field>
      <Field label="Category" error={error("category")} className="sm:col-span-2">
        {(id) => (
          <>
            <Input id={id} list={listId} placeholder="Wedding, Portrait, Event…" value={values.category} onChange={(e) => set("category", e.target.value)} invalid={!!error("category")} />
            <datalist id={listId}>
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </>
        )}
      </Field>
    </div>
  );
}
