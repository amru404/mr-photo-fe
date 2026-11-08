"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Field, PasswordInput } from "@/components/ui/field";
import { api } from "@/lib/api";
import { useRequireUser } from "@/lib/auth";
import { useForm } from "@/lib/use-form";

export default function ConfirmPasswordPage() {
  useRequireUser();
  const router = useRouter();
  const form = useForm({ password: "" });
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post("/auth/confirm-password", form.values);
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
    } catch (error) {
      form.capture(error, "password");
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Confirm your password" description="This is a secure area. Please confirm your password before continuing.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Password" error={form.error("password")}>
          {(id) => (
            <PasswordInput id={id} autoComplete="current-password" autoFocus value={form.values.password} onChange={(e) => form.set("password", e.target.value)} invalid={!!form.error("password")} />
          )}
        </Field>
        <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">
          Confirm
        </Button>
      </form>
    </AuthShell>
  );
}
