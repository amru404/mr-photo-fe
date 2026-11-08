"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, PasswordInput } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { api } from "@/lib/api";
import { useRedirectIfSignedIn, useSetUser } from "@/lib/auth";
import type { User } from "@/lib/types";
import { useForm } from "@/lib/use-form";

export default function LoginPage() {
  useRedirectIfSignedIn();
  const setUser = useSetUser();
  const form = useForm({ email: "", password: "", remember: false });
  const [busy, setBusy] = useState(false);
  const [status] = useState(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("status"),
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const { user } = await api.post<{ user: User }>("/auth/login", form.values);
      setUser(user);
    } catch (error) {
      form.capture(error, "email");
      form.set("password", "");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Sign in"
      description="Your projects, client selections and deliveries."
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="font-medium text-ink underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {status && <Notice tone="success" className="mb-6">{status}</Notice>}

      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email" error={form.error("email")}>
          {(id) => (
            <Input
              id={id}
              type="email"
              autoComplete="username"
              autoFocus
              required
              value={form.values.email}
              onChange={(event) => form.set("email", event.target.value)}
              invalid={!!form.error("email")}
            />
          )}
        </Field>

        <Field
          label="Password"
          error={form.error("password")}
          aside={
            <Link href="/forgot-password" className="text-[13px] text-muted hover:text-ink">
              Forgot your password?
            </Link>
          }
        >
          {(id) => (
            <PasswordInput
              id={id}
              autoComplete="current-password"
              required
              value={form.values.password}
              onChange={(event) => form.set("password", event.target.value)}
              invalid={!!form.error("password")}
            />
          )}
        </Field>

        <Checkbox
          label="Remember me"
          checked={form.values.remember}
          onChange={(event) => form.set("remember", event.target.checked)}
        />

        <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
