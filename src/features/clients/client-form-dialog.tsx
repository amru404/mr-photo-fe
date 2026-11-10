"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { api } from "@/lib/api";
import type { Client } from "@/lib/types";
import { useForm } from "@/lib/use-form";
import { useInvalidateClients } from "./use-clients";

/**
 * Create or edit a client. Rendered in a portal so it can open from inside
 * another form (the project details) without nesting <form>s.
 */
export function ClientFormDialog({
  client,
  initialName = "",
  onClose,
  onSaved,
}: {
  client?: Client | null;
  initialName?: string;
  onClose: () => void;
  onSaved?: (client: Client) => void;
}) {
  const invalidate = useInvalidateClients();
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const form = useForm({
    name: client?.name ?? initialName,
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    notes: client?.notes ?? "",
  });
  const { values } = form;

  useEffect(() => setMounted(true), []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    // React bubbles submit through portals; keep it away from an outer form.
    event.stopPropagation();
    setBusy(true);
    const payload = {
      name: values.name.trim(),
      email: values.email.trim() || null,
      phone: values.phone.trim() || null,
      notes: values.notes.trim() || null,
    };
    try {
      const result = client
        ? await api.patch<{ client: Client }>(`/clients/${client.id}`, payload)
        : await api.post<{ client: Client }>("/clients", payload);
      invalidate();
      onSaved?.(result.client);
      onClose();
    } catch (error) {
      form.capture(error, "name");
      setBusy(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <Dialog
      open
      onClose={onClose}
      title={client ? "Edit client" : "New client"}
      description={client ? "Changes show on every project for this client." : "Save who you're shooting for. Email and phone are optional."}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="client-form" loading={busy}>
            {client ? "Save client" : "Add client"}
          </Button>
        </>
      }
    >
      <form id="client-form" onSubmit={save} noValidate className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" error={form.error("name")} className="sm:col-span-2">
          {(id) => (
            <Input id={id} autoFocus autoComplete="off" value={values.name} onChange={(e) => form.set("name", e.target.value)} invalid={!!form.error("name")} />
          )}
        </Field>
        <Field label="Email" error={form.error("email")}>
          {(id) => (
            <Input id={id} type="email" placeholder="Optional" value={values.email} onChange={(e) => form.set("email", e.target.value)} invalid={!!form.error("email")} />
          )}
        </Field>
        <Field label="Phone / WhatsApp" error={form.error("phone")}>
          {(id) => (
            <Input id={id} type="tel" placeholder="Optional" value={values.phone} onChange={(e) => form.set("phone", e.target.value)} invalid={!!form.error("phone")} />
          )}
        </Field>
        <Field label="Notes" error={form.error("notes")} className="sm:col-span-2">
          {(id) => (
            <Textarea
              id={id}
              rows={3}
              placeholder="Optional — anything worth remembering about this client"
              value={values.notes}
              onChange={(e) => form.set("notes", e.target.value)}
              invalid={!!form.error("notes")}
            />
          )}
        </Field>
      </form>
    </Dialog>,
    document.body,
  );
}
