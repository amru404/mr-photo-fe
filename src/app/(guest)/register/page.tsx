"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Field, Input, PasswordInput } from "@/components/ui/field";
import { api } from "@/lib/api";
import { useRedirectIfSignedIn, useSetUser } from "@/lib/auth";
import type { User } from "@/lib/types";
import { useForm } from "@/lib/use-form";

export default function RegisterPage() {
  useRedirectIfSignedIn();
  const setUser = useSetUser();
  const form = useForm({ name: "", email: "", password: "", password_confirmation: "" });
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const { user } = await api.post<{ user: User }>("/auth/register", form.values);
      setUser(user);
    } catch (error) {
      form.capture(error, "email");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      description="Share proofing galleries straight from your Google Drive."
      footer={
        <>
          Already registered?{" "}
          <Link href="/login" className="font-medium text-ink underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Name" error={form.error("name")}>
          {(id) => (
            <Input id={id} autoComplete="name" autoFocus value={form.values.name} onChange={(e) => form.set("name", e.target.value)} invalid={!!form.error("name")} />
          )}
        </Field>
        <Field label="Email" error={form.error("email")}>
          {(id) => (
            <Input id={id} type="email" autoComplete="username" value={form.values.email} onChange={(e) => form.set("email", e.target.value)} invalid={!!form.error("email")} />
          )}
        </Field>
        <Field label="Password" error={form.error("password")}>
          {(id) => (
            <PasswordInput id={id} autoComplete="new-password" value={form.values.password} onChange={(e) => form.set("password", e.target.value)} invalid={!!form.error("password")} />
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
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
