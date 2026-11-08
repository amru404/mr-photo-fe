"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { useSetUser } from "@/lib/auth";
import type { User } from "@/lib/types";

/** The link in the verification email; forwards its signature to the API. */
export default function VerifyLinkPage({ params }: { params: Promise<{ id: string; hash: string }> }) {
  const { id, hash } = use(params);
  const router = useRouter();
  const setUser = useSetUser();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    api
      .get<{ user: User }>(`/auth/verify-email/${id}/${hash}${window.location.search}`)
      .then(({ user }) => {
        setUser(user);
        router.replace("/dashboard?verified=1");
      })
      .catch((reason) => {
        if (reason instanceof ApiError && reason.status === 401) {
          router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
          return;
        }
        setError("This verification link is invalid or has expired.");
      });
  }, [id, hash, router, setUser]);

  return (
    <AuthShell title={error ? "Link not valid" : "Verifying your email"} description={error ?? undefined}>
      {error ? (
        <Link href="/verify-email" className="text-sm font-medium text-ink underline-offset-4 hover:underline">
          Send a new link
        </Link>
      ) : (
        <Spinner className="size-5 text-muted" />
      )}
    </AuthShell>
  );
}
