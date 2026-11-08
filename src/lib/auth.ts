"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./api";
import type { User } from "./types";

export const userKey = ["auth", "user"] as const;

/** The signed-in photographer, or null when signed out. */
export function useUser() {
  return useQuery({
    queryKey: userKey,
    queryFn: async () => {
      try {
        return (await api.get<{ user: User }>("/auth/user")).user;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 60_000,
  });
}

export function useSetUser() {
  const client = useQueryClient();
  return (user: User | null) => {
    if (user === null) client.clear();
    client.setQueryData(userKey, user);
  };
}

/** Sends signed-out visitors to /login, keeping where they were headed. */
export function useRequireUser() {
  const query = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (query.data === null) {
      const next = typeof window === "undefined" ? pathname : window.location.pathname + window.location.search;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    } else if (query.data?.must_verify_email && pathname !== "/verify-email") {
      router.replace("/verify-email");
    }
  }, [query.data, pathname, router]);

  return query;
}

/** Signed-in visitors skip the guest pages. */
export function useRedirectIfSignedIn() {
  const query = useUser();
  const router = useRouter();

  useEffect(() => {
    if (query.data) {
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
    }
  }, [query.data, router]);

  return query;
}
