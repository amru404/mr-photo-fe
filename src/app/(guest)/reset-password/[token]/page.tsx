"use client";

import { use, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Field, Input, PasswordInput } from "@/components/ui/field";
import { api } from "@/lib/api";
import { useForm } from "@/lib/use-form";

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const search = useSearchParams();
  const form = useForm({ email: search.get("email") ?? "", password: "", password_confirmation: "" });
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const { status } = await api.post<{ status: string }>("/auth/reset-password", { ...form.values, token });
      router.replace(`/login?status=${encodeURIComponent(status)}`);
    } catch (error) {
      form.capture(error, "email");
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Choose a new password">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email" error={form.error("email")}>
          {(id) => (
            <Input id={id} type="email" autoComplete="username" value={form.values.email} onChange={(e) => form.set("email", e.target.value)} invalid={!!form.error("email")} />
          )}
        </Field>
        <Field label="New password" error={form.error("password")}>
          {(id) => (
            <PasswordInput id={id} autoComplete="new-password" autoFocus value={form.values.password} onChange={(e) => form.set("password", e.target.value)} invalid={!!form.error("password")} />
          )}
        </Field>
        <Field label="Confirm password" error={form.error("password_confirmation")}>
          {(id) => (
            <PasswordInput
              id={id}
              autoComplete="new-password"
              value={form.values.password_confirmation}
              onChange={(e) => form.set("password_confirmation", e.target.value)}
              invalid={!!form.error("password_confirmation")}
            />
          )}
        </Field>
        <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">
          Reset password
        </Button>
      </form>
    </AuthShell>
  );
}
