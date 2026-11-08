"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { api } from "@/lib/api";
import { useRedirectIfSignedIn } from "@/lib/auth";
import { useForm } from "@/lib/use-form";

export default function ForgotPasswordPage() {
  useRedirectIfSignedIn();
  const form = useForm({ email: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setSent(null);
    try {
      const { status } = await api.post<{ status: string }>("/auth/forgot-password", form.values);
      setSent(status);
      form.set("email", "");
    } catch (error) {
      form.capture(error, "email");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      description="Enter your email and we'll send you a link to choose a new one."
      footer={
        <Link href="/login" className="font-medium text-ink underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent && <Notice tone="success" className="mb-6">{sent}</Notice>}
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email" error={form.error("email")}>
          {(id) => (
            <Input id={id} type="email" autoComplete="username" autoFocus value={form.values.email} onChange={(e) => form.set("email", e.target.value)} invalid={!!form.error("email")} />
          )}
        </Field>
        <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">
          Email password reset link
        </Button>
      </form>
    </AuthShell>
  );
}
