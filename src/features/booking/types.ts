/** The public booking form's payloads (see "Public endpoints" in the booking contract). */

import type { AnswerSnapshot, Answers, BookingFile, FormSchema } from "@/features/booking-form/schema";

export interface BookingCategory {
  id: number;
  name: string;
  /** Down payment asked for, 0–100. */
  deposit_percent: number;
  /** The category's custom questions; `{ version: 1, fields: [] }` when it has none. */
  form: FormSchema;
}

/** GET /api/book/{token} */
export interface BookingInfo {
  studio: { name: string };
  categories: BookingCategory[];
  /** "Y-m-d" on the studio's clock: the earliest shoot date allowed. */
  today: string;
}

export type BookingStatusValue = "pending" | "accepted" | "declined";

export interface PublicBookingRequest {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  category_id: number | null;
  category: string | null;
  /** "Y-m-d" */
  shoot_date: string;
  /** "HH:MM" */
  shoot_time: string | null;
  location: string;
  notes: string | null;
  status: BookingStatusValue;
  status_label: "Waiting for approval" | "Approved" | "Declined";
  decline_reason: string | null;
  created_at: string;
  updated_at: string;
  /** Raw answers to the category's questions, for prefilling an edit. */
  answers: Answers;
  /** The answers as shown, frozen at submit time. */
  answer_snapshot: AnswerSnapshot[];
  /** Uploads, with short-lived signed urls. */
  files: BookingFile[];
  /** The category's down payment, null without a category. */
  deposit_percent: number | null;
}

/** The body of POST /requests; PATCH sends the same plus the (unchangeable) email. */
export interface BookingPayload {
  name: string;
  email: string;
  phone: string | null;
  category_id: number | null;
  shoot_date: string;
  shoot_time: string | null;
  location: string;
  notes: string | null;
  /** Answers to the category's questions, visible ones only (see pruneAnswers). */
  answers?: Answers;
}
