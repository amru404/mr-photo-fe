"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { writeClipboard } from "@/components/ui/copy-button";
import { useConfirm, useToast } from "@/components/ui/feedback";
import { api, ApiError, query } from "@/lib/api";
import type { BookingLink, BookingRequest, BookingRequestList, BookingRequestStatus } from "@/lib/types";

export type BookingFilter = BookingRequestStatus | "all";

export const BOOKING_LINK_KEY = ["booking-link"] as const;

/** One page of `GET /booking-requests`. The pending first page doubles as the nav badge's count. */
export const bookingListKey = (status: BookingFilter, page: number) => ["booking-requests", { status, page }] as const;

export const fetchBookingList = (status: BookingFilter, page: number) =>
  api.get<BookingRequestList>(`/booking-requests${query({ status, page: page > 1 ? page : null })}`);

const fetchBookingLink = () => api.get<BookingLink>("/booking-link");

/** The photographer's public form link (`GET /booking-link`). */
export function useBookingLink(enabled = true) {
  return useQuery({ queryKey: BOOKING_LINK_KEY, queryFn: fetchBookingLink, staleTime: 5 * 60_000, enabled });
}

/** Pending count for the nav badge: the same query as the Bookings page's default view. */
export function usePendingBookingCount(enabled: boolean) {
  const list = useQuery({
    queryKey: bookingListKey("pending", 1),
    queryFn: () => fetchBookingList("pending", 1),
    staleTime: 60_000,
    refetchInterval: 120_000,
    enabled,
  });
  return list.data?.counts.pending ?? 0;
}

/** Copies the booking link, fetching it first if it isn't cached yet. */
export function useCopyBookingLink({ announce = false }: { announce?: boolean } = {}) {
  const client = useQueryClient();
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      const link = await client.fetchQuery({ queryKey: BOOKING_LINK_KEY, queryFn: fetchBookingLink, staleTime: 5 * 60_000 });
      await writeClipboard(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (announce) toast("Booking link copied.");
    } catch {
      toast("Couldn't get your booking link.", "error");
    }
  }

  return { copy, copied };
}

/** "New link" with a confirm, since the old link stops working. */
export function useRegenerateBookingLink() {
  const client = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const mutation = useMutation({
    mutationFn: () => api.post<BookingLink>("/booking-link"),
    onSuccess: (link) => {
      client.setQueryData(BOOKING_LINK_KEY, link);
      toast("New booking link ready.");
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Couldn't make a new link.", "error"),
  });

  async function regenerate() {
    const ok = await confirm({
      title: "Generate a new booking link?",
      message: "The current link stops working right away. Anyone who has it will need the new one.",
      confirmLabel: "Generate new link",
      tone: "danger",
    });
    if (ok) mutation.mutate();
  }

  return { regenerate, pending: mutation.isPending };
}

function refresh(client: QueryClient, keys: string[]) {
  for (const key of keys) client.invalidateQueries({ queryKey: [key] });
}

/** Accept: the backend books a project (and finds or makes the client) with this much already paid. */
export function useAcceptRequest() {
  const client = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, paid_percent }: { id: number; paid_percent: number }) =>
      api.post<{ request: BookingRequest; project: { id: number; title: string } }>(`/booking-requests/${id}/accept`, { paid_percent }),
    onSuccess: ({ project }) =>
      toast(
        <span>
          Booked ·{" "}
          <Link href={`/projects/${project.id}`} className="underline underline-offset-2">
            open project
          </Link>
        </span>,
      ),
    onError: (error) => toast(error instanceof ApiError ? error.message : "Couldn't accept the request.", "error"),
    onSettled: () => refresh(client, ["schedule", "overview", "projects", "booking-requests", "clients"]),
  });
}

export function useDeclineRequest() {
  const client = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      api.post<{ request: BookingRequest }>(`/booking-requests/${id}/decline`, reason ? { reason } : {}),
    onSuccess: ({ request }) => toast(`${request.name}'s request declined.`),
    onSettled: () => refresh(client, ["schedule", "overview", "booking-requests"]),
  });
}
