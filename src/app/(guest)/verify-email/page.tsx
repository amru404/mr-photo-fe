"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { api } from "@/lib/api";
import { useSetUser, useUser } from "@/lib/auth";
import { useTitle } from "@/lib/use-title";

export default function VerifyEmailPage() {
  useTitle("Verify email");
  const router = useRouter();
  const user = useUser();
  const setUser = useSetUser();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user.data === null) router.replace("/login");
    else if (user.data && !user.data.must_verify_email) router.replace("/dashboard");
  }, [user.data, router]);

  async function resend() {
    setBusy(true);
    const result = await api.post<{ verified?: boolean }>("/auth/email/verification-notification").finally(() => setBusy(false));
    if (result.verified) router.replace("/dashboard");
    else setSent(true);
  }

  async function logout() {
    await api.post("/auth/logout");
    setUser(null);
    router.replace("/login");
  }

  return (
    <AuthShell
      title="Check your inbox"
      description="Thanks for signing up! Before getting started, verify your email address with the link we just sent you. If it didn't arrive, we'll gladly send another."
    >
      {sent && (
        <Notice tone="success" className="mb-6">
          A new verification link has been sent to the email address you provided during registration.
        </Notice>
      )}
      <div className="flex items-center justify-between gap-4">
        <Button variant="primary" loading={busy} onClick={resend}>
          Resend verification email
        </Button>
        <Button variant="ghost" onClick={logout}>
          Log out
        </Button>
      </div>
    </AuthShell>
  );
}
