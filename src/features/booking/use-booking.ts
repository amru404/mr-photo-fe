"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { time } from "@/lib/format";
import type { BookingInfo, BookingPayload, PublicBookingRequest } from "./types";

export const bookingKey = (token: string) => ["booking", token] as const;
export const lookupKey = (token: string, email?: string) =>
  (email === undefined ? [...bookingKey(token), "lookup"] : [...bookingKey(token), "lookup", email]) as readonly unknown[];

/** The studio's name, its categories and the earliest date it takes. */
export function useBookingInfo(token: string) {
  return useQuery({
    queryKey: bookingKey(token),
    queryFn: () => api.get<BookingInfo>(`/book/${token}`),
    staleTime: 5 * 60_000,
  });
}

/**
 * The visitor's requests for one email. The lookup is a POST (so the email
 * stays out of URLs and logs) but it reads like a query, so it is cached:
 * switching modes and back doesn't ask again.
 */
export function useBookingLookup(token: string, email: string) {
  return useQuery({
    queryKey: lookupKey(token, email),
    queryFn: async () => (await api.post<{ requests: PublicBookingRequest[] }>(`/book/${token}/lookup`, { email })).requests,
    enabled: email !== "",
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

/** New uploads per file question, and existing files to delete (edit only). */
export interface BookingUploads {
  files: Record<string, File[]>;
  remove: number[];
}

const hasUploads = (uploads?: BookingUploads): uploads is BookingUploads =>
  !!uploads && (uploads.remove.length > 0 || Object.values(uploads.files).some((list) => list.length > 0));

/**
 * The multipart body: base fields, `answers` as a JSON string,
 * `files[<id>][]` and `remove_files[]`. Laravel turns the blanks back into nulls.
 */
function bookingFormData(payload: BookingPayload, uploads: BookingUploads, method?: "PATCH"): FormData {
  const data = new FormData();
  if (method) data.append("_method", method);
  const { answers, ...base } = payload;
  for (const [key, value] of Object.entries(base)) data.append(key, value === null || value === undefined ? "" : String(value));
  data.append("answers", JSON.stringify(answers ?? {}));
  for (const [fieldId, list] of Object.entries(uploads.files)) {
    for (const file of list) data.append(`files[${fieldId}][]`, file, file.name);
  }
  for (const id of uploads.remove) data.append("remove_files[]", String(id));
  return data;
}

/** JSON without files; multipart when there are uploads or removals. */
export function createBooking(token: string, payload: BookingPayload, uploads?: BookingUploads) {
  const path = `/book/${token}/requests`;
  return api.post<{ request: PublicBookingRequest; message: string }>(path, hasUploads(uploads) ? bookingFormData(payload, uploads) : payload);
}

/** PATCH as JSON, or a POST with `_method=PATCH` when files go along (PHP only parses multipart on POST). */
export function updateBooking(token: string, id: number, payload: BookingPayload, uploads?: BookingUploads) {
  const path = `/book/${token}/requests/${id}`;
  return hasUploads(uploads)
    ? api.post<{ request: PublicBookingRequest }>(path, bookingFormData(payload, uploads, "PATCH"))
    : api.patch<{ request: PublicBookingRequest }>(path, payload);
}

/* The looked-up email, kept for this tab only. Storage can be blocked, so every access is guarded. */

const emailStorageKey = (token: string) => `booking-email:${token}`;

export function readStoredEmail(token: string): string {
  try {
    return window.sessionStorage.getItem(emailStorageKey(token)) ?? "";
  } catch {
    return "";
  }
}

export function storeEmail(token: string, email: string): void {
  try {
    if (email) window.sessionStorage.setItem(emailStorageKey(token), email);
    else window.sessionStorage.removeItem(emailStorageKey(token));
  } catch {
    // Private mode or blocked storage: the visitor just types it again.
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** "Saturday, November 21, 2026" */
export function shootDay(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

/** "Sat, Nov 21, 2026" */
export function shootDayShort(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

/** "HH:MM" → "4:00 PM" */
export function shootTime(value: string | null): string | null {
  return value ? time(`2000-01-01T${value.slice(0, 5)}`) : null;
}
