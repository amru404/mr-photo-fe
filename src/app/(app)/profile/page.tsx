"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { PageBody, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, PasswordInput } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Panel, PanelFooter } from "@/components/ui/panel";
import { api } from "@/lib/api";
import { useSetUser, useUser } from "@/lib/auth";
import type { User } from "@/lib/types";
import { useForm } from "@/lib/use-form";
import { useTitle } from "@/lib/use-title";

export default function ProfilePage() {
  useTitle("Profile");
  const { data: user } = useUser();
  if (!user) return null;

  return (
    <PageBody width="wide">
      <PageHeader title="Profile" description={user.email} />
      <div className="mt-8 divide-y divide-line">
        <Section title="Profile information" description="Your account's name and email address.">
          <ProfileForm user={user} />
        </Section>
        <Section title="Update password" description="Use a long, random password to keep your account secure.">
          <PasswordForm />
        </Section>
        <Section title="Delete account" description="Permanently removes your account and everything in it.">
          <DeleteAccount />
        </Section>
      </div>
    </PageBody>
  );
}

/** Settings row: what it is on the left, the panel on the right. */
function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 py-8 first:pt-0 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-10">
      <div className="lg:pt-1">
        <h2 className="text-base font-medium text-ink">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div className="max-w-2xl">{children}</div>
    </section>
  );
}

function SavedStamp({ shown }: { shown: boolean }) {
  return shown ? <span className="text-sm text-muted">Saved.</span> : null;
}

function ProfileForm({ user }: { user: User }) {
  const setUser = useSetUser();
  const form = useForm({ name: user.name, email: user.email });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await api.patch<{ user: User }>("/profile", form.values);
      setUser(result.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      form.capture(error, "email");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    await api.post("/auth/email/verification-notification");
    setLinkSent(true);
  }

  return (
    <form onSubmit={save} noValidate>
      <Panel>
        <div className="space-y-4 p-5">
          <Field label="Name" error={form.error("name")}>
            {(id) => <Input id={id} autoComplete="name" value={form.values.name} onChange={(e) => form.set("name", e.target.value)} invalid={!!form.error("name")} />}
          </Field>
          <Field label="Email" error={form.error("email")}>
            {(id) => (
              <Input id={id} type="email" autoComplete="username" value={form.values.email} onChange={(e) => form.set("email", e.target.value)} invalid={!!form.error("email")} />
            )}
          </Field>
          {user.must_verify_email && (
            <Notice tone="warning">
              Your email address is unverified.{" "}
              <button type="button" onClick={resend} className="font-medium underline underline-offset-4">
                Re-send the verification email.
              </button>
              {linkSent && <span className="mt-1 block">A new verification link has been sent to your email address.</span>}
            </Notice>
          )}
        </div>
        <PanelFooter>
          <SavedStamp shown={saved} />
          <Button type="submit" variant="primary" loading={busy}>
            Save
          </Button>
        </PanelFooter>
      </Panel>
    </form>
  );
}

function PasswordForm() {
  const blank = { current_password: "", password: "", password_confirmation: "" };
  const form = useForm(blank);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.put("/profile/password", form.values);
      form.setValues(blank);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      form.setValues(blank);
      form.capture(error, "current_password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} noValidate>
      <Panel>
        <div className="space-y-4 p-5">
          <Field label="Current password" error={form.error("current_password")}>
            {(id) => (
              <PasswordInput
                id={id}
                autoComplete="current-password"
                value={form.values.current_password}
                onChange={(e) => form.set("current_password", e.target.value)}
                invalid={!!form.error("current_password")}
              />
            )}
          </Field>
          <Field label="New password" error={form.error("password")}>
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
        </div>
        <PanelFooter>
          <SavedStamp shown={saved} />
          <Button type="submit" variant="primary" loading={busy}>
            Save
          </Button>
        </PanelFooter>
      </Panel>
    </form>
  );
}

function DeleteAccount() {
  const router = useRouter();
  const setUser = useSetUser();
  const [open, setOpen] = useState(false);
  const form = useForm({ password: "" });
  const [busy, setBusy] = useState(false);

  async function destroy(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.delete("/profile", form.values);
      setUser(null);
      router.replace("/login");
    } catch (error) {
      form.capture(error, "password");
      setBusy(false);
    }
  }

  return (
    <Panel className="p-5">
      <p className="text-sm text-muted">
        Once your account is deleted, all of its projects and data are permanently deleted. Download anything you want to keep first.
      </p>
      <Button variant="danger" className="mt-4" onClick={() => setOpen(true)}>
        Delete account
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete your account?"
        description="All of its projects and data will be permanently deleted. Enter your password to confirm."
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="danger" type="submit" form="delete-account" loading={busy}>
              Delete account
            </Button>
          </>
        }
      >
        <form id="delete-account" onSubmit={destroy} noValidate>
          <Field label="Password" error={form.error("password")}>
            {(id) => (
              <PasswordInput id={id} autoComplete="current-password" autoFocus value={form.values.password} onChange={(e) => form.set("password", e.target.value)} invalid={!!form.error("password")} />
            )}
          </Field>
        </form>
      </Dialog>
    </Panel>
  );
}
