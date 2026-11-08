/** Formatting in the viewer's locale and timezone; copy stays in English like the backend. */

const LOCALE = "en-US";

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return count === 1 ? singular : pluralForm;
}

/** "3 photos", "1 photo" */
export function count(n: number, singular: string, pluralForm?: string): string {
  return `${n.toLocaleString(LOCALE)} ${plural(n, singular, pluralForm)}`;
}

export function number(n: number): string {
  return n.toLocaleString(LOCALE);
}

function parse(value: string | Date): Date {
  if (value instanceof Date) return value;
  // A bare date (2026-10-24) is a calendar day, not midnight UTC.
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
}

/** Oct 24 */
export function shortDate(value: string | Date): string {
  return parse(value).toLocaleDateString(LOCALE, { month: "short", day: "numeric" });
}

/** Oct 24, 2026 */
export function longDate(value: string | Date): string {
  return parse(value).toLocaleDateString(LOCALE, { month: "short", day: "numeric", year: "numeric" });
}

/** October 24, 2026 at 4:09 PM */
export function dateTime(value: string | Date): string {
  const date = parse(value);
  return `${date.toLocaleDateString(LOCALE, { month: "short", day: "numeric", year: "numeric" })} at ${time(date)}`;
}

/** 4:09 PM */
export function time(value: string | Date): string {
  return parse(value).toLocaleTimeString(LOCALE, { hour: "numeric", minute: "2-digit" });
}

/** "Today", "Yesterday", "Friday, Oct 23" or "Oct 23, 2025" */
export function dayLabel(day: string, today: string): string {
  const date = parse(day);
  const now = parse(today);
  const diff = Math.round((now.getTime() - date.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return date.getFullYear() === now.getFullYear()
    ? date.toLocaleDateString(LOCALE, { weekday: "long", month: "short", day: "numeric" })
    : longDate(date);
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
  ["second", 1],
];

/** "3 hours ago", "in 2 days" */
export function relative(value: string | Date, now = Date.now()): string {
  const seconds = Math.round((parse(value).getTime() - now) / 1000);
  const formatter = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size || unit === "second") {
      return formatter.format(Math.round(seconds / size), unit);
    }
  }
  return formatter.format(0, "second");
}

/** 12.4 MB */
export function fileSize(bytes: number | null | undefined): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

/** Whole days between two calendar days (b − a). */
export function daysBetween(a: string | Date, b: string | Date): number {
  const start = parse(a);
  const end = parse(b);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function addDays(value: Date, days: number): Date {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

/** yyyy-mm-dd in local time, for <input type="date">. */
export function isoDay(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function initial(name: string | null | undefined): string {
  return (name ?? "").trim().charAt(0).toUpperCase() || "·";
}
