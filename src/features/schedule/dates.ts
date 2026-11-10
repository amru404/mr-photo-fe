/**
 * Calendar math on "Y-m-d" day strings and "Y-m" month keys. Everything goes
 * through the local Date(y, m, d) constructor, never new Date("2026-11-14")
 * (which parses as UTC midnight and can land on the previous day).
 */
import { isoDay, longDate, shortDate, time } from "@/lib/format";

const LOCALE = "en-US";

function parts(value: string): number[] {
  return value.split("-").map(Number);
}

/** A local Date at midnight for a Y-m-d day. */
export function parseDay(day: string): Date {
  const [y, m, d] = parts(day);
  return new Date(y, m - 1, d);
}

export function todayDay(): string {
  return isoDay(new Date());
}

export function isDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && isoDay(parseDay(value)) === value;
}

export function isMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** "2026-11-14" → "2026-11" */
export function monthOf(day: string): string {
  return day.slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = parts(month);
  return monthOf(isoDay(new Date(y, m - 1 + delta, 1)));
}

/** The 42 days (6 weeks, Monday first) that frame a month. */
export function monthGrid(month: string): string[] {
  const [y, m] = parts(month);
  const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => isoDay(new Date(y, m - 1, 1 - offset + i)));
}

/** "November 2026" */
export function monthLabel(month: string): string {
  const [y, m] = parts(month);
  return new Date(y, m - 1, 1).toLocaleDateString(LOCALE, { month: "long", year: "numeric" });
}

/** "Saturday, Nov 14", with the year when it is not this year. */
export function dayHeading(day: string, today: string): string {
  const options: Intl.DateTimeFormatOptions = { weekday: "long", month: "short", day: "numeric" };
  if (day.slice(0, 4) !== today.slice(0, 4)) options.year = "numeric";
  return parseDay(day).toLocaleDateString(LOCALE, options);
}

/** "Nov 14", or "Nov 14, 2025" outside this year. */
export function dayShort(day: string, today: string): string {
  return day.slice(0, 4) === today.slice(0, 4) ? shortDate(parseDay(day)) : longDate(parseDay(day));
}

/** "14:30" on a day → "2:30 PM" */
export function shootTime(day: string, hhmm: string): string {
  const [h, min] = hhmm.split(":").map(Number);
  const [y, m, d] = parts(day);
  return time(new Date(y, m - 1, d, h || 0, min || 0));
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
