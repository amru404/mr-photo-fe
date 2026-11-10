import type { ProjectStatusValue, ScheduleRequest } from "@/lib/types";

export type { ScheduleRequest };

/** One booked shoot (a project) on the schedule. GET /api/schedule and /api/schedule/board. */
export interface ScheduleEvent {
  id: number; // project id
  title: string;
  date: string; // Y-m-d
  time: string | null; // HH:MM
  location: string | null;
  notes: string | null;
  client: { id: number; name: string; phone: string | null } | null;
  category: string | null;
  status: { value: ProjectStatusValue; label: string };
  is_paid: boolean;
  /** Share received so far, 0–100; anything between is a down payment. */
  paid_percent: number;
  has_photos_folder: boolean;
  cover_url: string | null;
  /** Not in the contract yet; the card menu offers "Copy client link" only when present. */
  share_url?: string | null;
}

export interface Schedule {
  from: string; // Y-m-d
  to: string; // Y-m-d
  today: string; // Y-m-d
  /** Ordered by date, time (nulls last), title. */
  events: ScheduleEvent[];
  /** Pending booking requests in range (not yet projects), ordered by date, time (nulls last), name. */
  requests: ScheduleRequest[];
}

export type ScheduleColumnKey = "booked" | "selection" | "editing" | "completed";

export interface ScheduleColumn {
  key: ScheduleColumnKey;
  label: string;
  count: number;
  items: ScheduleEvent[];
}

export interface ScheduleBoard {
  columns: ScheduleColumn[];
}
