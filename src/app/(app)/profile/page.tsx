"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Pill } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, PasswordInput } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { PanelFooter } from "@/components/ui/panel";
import { cn } from "@/lib/cn";
import { initial } from "@/lib/format";
import { api } from "@/lib/api";
import { useSetUser, useUser } from "@/lib/auth";
import type { User } from "@/lib/types";
import { useForm } from "@/lib/use-form";
import { useTitle } from "@/lib/use-title";
import { CategoriesPanel } from "@/features/categories/categories-panel";
import { CopyButton } from "@/components/ui/copy-button";
import { useBookingLink, useRegenerateBookingLink } from "@/features/bookings/use-bookings";
import { RefreshCw } from "lucide-react";

const GRID_BACKGROUND =
  "pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(var(--rule)_1px,transparent_1px),linear-gradient(90deg,var(--rule)_1px,transparent_1px)] [background-size:44px_44px]";

export default function ProfilePage() {
  useTitle("Profile");
  const { data: user } = useUser();
  if (!user) return null;

  return (
    <div className="px-4 pb-10 pt-5 sm:px-6 lg:px-10">
      {/* The board: who is signed in, like the project page's header. */}
      <section className="relative overflow-hidden rounded-board border border-line bg-surface">
        <div aria-hidden="true" className={GRID_BACKGROUND} />
        <div className="relative flex items-center gap-4 p-5">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-ink text-xl font-semibold text-ground">{initial(user.name)}</span>
          <div className="min-w-0">
            <p className="eyebrow">Account</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="min-w-0 truncate text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">{user.name}</h1>
              <Pill tone={user.must_verify_email ? "warning" : "positive"}>{user.must_verify_email ? "Email unverified" : "Verified"}</Pill>
            </div>
            <p className="mt-0.5 truncate text-[13px] text-muted">
              {user.email}
              {user.brand_name && ` · ${user.brand_name}`}
            </p>
          </div>
        </div>
      </section>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <Deck title="Profile information" description="Your account's name and email address.">
          <ProfileForm user={user} />
        </Deck>
        <Deck title="Update password" description="Use a long, random password to keep your account secure.">
          <PasswordForm />
        </Deck>
        <Deck
          title="Booking form"
          description="Share this link so clients can request a shoot. Requests show on your schedule for you to accept or decline."
          className="lg:col-span-2"
        >
          <BookingForm />
        </Deck>
        <Deck title="Project categories" description="Used to group projects. Deleting one keeps its projects, just without a category." className="lg:col-span-2">
          <CategoriesPanel />
        </Deck>
        <Deck title="Delete account" description="Permanently removes your account and everything in it." className="border-status-expired/30 lg:col-span-2">
          <DeleteAccount />
        </Deck>
      </div>
    </div>
  );
}

/** A settings deck: bold title and a grey line over a rule, then the form. */
function Deck({ title, description, className, children }: { title: string; description: string; className?: string; children: ReactNode }) {
  return (
    <section className={cn("overflow-hidden rounded-card border border-line bg-surface", className)}>
      <header className="border-b border-rule px-5 py-4">
        <h2 className="deck-title">{title}</h2>
        <p className="mt-1.5 text-[13px] text-muted">{description}</p>
      </header>
      {children}
    </section>
  );
}

function BookingForm() {
  const link = useBookingLink();
  const { regenerate, pending } = useRegenerateBookingLink();
  return (
    <div className="p-5">
      <Field label="Public link" hint="Generating a new link makes the current one stop working.">
        {(id) => (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id={id}
              readOnly
              value={link.data?.url ?? (link.isError ? "Couldn't load your link" : "Loading…")}
              onFocus={(event) => event.target.select()}
              className="min-w-0 flex-1 font-mono"
            />
            <div className="flex gap-2">
              {link.data ? (
                <CopyButton text={link.data.url}>Copy link</CopyButton>
              ) : (
                <Button disabled>Copy link</Button>
              )}
              <Button onClick={regenerate} loading={pending} disabled={!link.data} icon={<RefreshCw className="size-4" />}>
                Generate new link
              </Button>
            </div>
          </div>
        )}
      </Field>
    </div>
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
      <div>
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
      </div>
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
      <div>
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
      </div>
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
    <div className="p-5 pt-4">
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
    </div>
  );
}
