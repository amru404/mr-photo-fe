"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CalendarPlus, Check, ChevronLeft, ChevronRight, Clock, Link2, Mail, MapPin, Phone, Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, LoadError } from "@/components/ui/notice";
import { PaymentBadge } from "@/components/ui/payment";
import { Pill, StatusBadge } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/spinner";
import { api, query } from "@/lib/api";
import { cn } from "@/lib/cn";
import { count } from "@/lib/format";
import { STATUS_TONE } from "@/lib/status-tone";
import { useQueryState } from "@/lib/use-query-state";
import { useTitle } from "@/lib/use-title";
import { DpProofPill, PendingDot, RequestActions, RequestStatusBadge } from "@/features/bookings/request-actions";
import { useBookingLink, useCopyBookingLink } from "@/features/bookings/use-bookings";
import { ScheduleBoardRow } from "./board";
import { dayHeading, dayShort, isDay, isMonth, monthGrid, monthLabel, monthOf, parseDay, shiftMonth, shootTime, todayDay, WEEKDAYS } from "./dates";
import { eventStatus } from "./event";
import type { Schedule, ScheduleEvent, ScheduleRequest } from "./types";

const GRID_BACKGROUND =
  "pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(var(--rule)_1px,transparent_1px),linear-gradient(90deg,var(--rule)_1px,transparent_1px)] [background-size:44px_44px]";

const newBookingHref = (day: string) => `/projects/new${query({ shoot_date: day })}`;

// --- Screen -----------------------------------------------------------------

export function ScheduleScreen() {
  useTitle("Schedule");
  const url = useQueryState();
  const today = useMemo(() => todayDay(), []);

  // ?month=2026-11&day=2026-11-14 — a day alone implies its month; neither means this month.
  const dayParam = url.get("day");
  const monthParam = url.get("month");
  const picked = isDay(dayParam) ? dayParam : null;
  const month = isMonth(monthParam) ? monthParam : picked ? monthOf(picked) : monthOf(today);
  const grid = useMemo(() => monthGrid(month), [month]);
  const from = grid[0];
  const to = grid[grid.length - 1];

  const schedule = useQuery({
    queryKey: ["schedule", { from, to }],
    queryFn: () => api.get<Schedule>(`/schedule${query({ from, to })}`),
    placeholderData: keepPreviousData,
  });

  const data = schedule.data;
  const byDay = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    for (const event of data?.events ?? []) {
      const list = map.get(event.date);
      if (list) list.push(event);
      else map.set(event.date, [event]);
    }
    return map;
  }, [data]);
  // Pending booking requests: not projects yet, so they get their own marker and card.
  const requestsByDay = useMemo(() => {
    const map = new Map<string, ScheduleRequest[]>();
    for (const request of data?.requests ?? []) {
      const list = map.get(request.date);
      if (list) list.push(request);
      else map.set(request.date, [request]);
    }
    return map;
  }, [data]);

  const loaded = !!data && !schedule.isPlaceholderData;
  // Nothing picked means the sheet lists the whole month; a picked day narrows it to that day.
  const selected = picked && grid.includes(picked) ? picked : null;
  // Events from the previous month's range are still right for the days both grids share.
  const covers = (day: string) => !!data && day >= data.from && day <= data.to;
  const monthEvents = loaded ? data.events.filter((event) => monthOf(event.date) === month) : null;
  const monthRequests = loaded ? (data.requests ?? []).filter((request) => monthOf(request.date) === month) : null;

  // Clicking the picked day again lets go of it and goes back to the month.
  const selectDay = (day: string) => url.set(day === selected ? { day: null } : { month: monthOf(day), day });
  const goMonth = (delta: number) => url.set({ month: shiftMonth(month, delta), day: null });
  const goToday = () => url.set({ month: null, day: null });

  return (
    <div className="px-4 pb-10 pt-5 sm:px-6 lg:px-10">
      {/* The board: the month on the left, the selected day's sheet on the right. */}
      <section className="relative overflow-hidden rounded-board border border-line bg-surface">
        <div aria-hidden="true" className={GRID_BACKGROUND} />

        <header className="relative flex flex-col gap-4 border-b border-rule p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">Schedule</p>
            <h1 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">{monthLabel(month)}</h1>
            <p className="mt-0.5 text-[13px] text-muted">
              {monthEvents ? (monthEvents.length ? `${count(monthEvents.length, "shoot")} this month` : "Nothing booked this month") : "Loading…"}
              {monthEvents && monthEvents.some((event) => !event.is_paid) && (
                <span> · {monthEvents.filter((event) => !event.is_paid).length} not fully paid</span>
              )}
              {monthRequests && monthRequests.length > 0 && <span> · {count(monthRequests.length, "request")} waiting</span>}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <CopyBookingLink />
            <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
            <IconButton label="Previous month" onClick={() => goMonth(-1)}>
              <ChevronLeft className="size-4" />
            </IconButton>
            <button
              type="button"
              onClick={goToday}
              disabled={month === monthOf(today) && !selected}
              className="flex h-9 items-center rounded-control border border-line bg-surface px-3.5 text-[13px] font-semibold text-muted transition-colors hover:bg-raised hover:text-ink disabled:pointer-events-none disabled:opacity-50"
            >
              Today
            </button>
            <IconButton label="Next month" onClick={() => goMonth(1)}>
              <ChevronRight className="size-4" />
            </IconButton>
          </div>
        </header>

        <div className="relative grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <MonthGrid
            month={month}
            grid={grid}
            today={today}
            selected={selected}
            byDay={byDay}
            requestsByDay={requestsByDay}
            covers={covers}
            dim={schedule.isPlaceholderData}
            onSelect={selectDay}
          />

          {/* On lg the sheet takes the calendar's height and scrolls inside it. */}
          <div className="border-t border-rule bg-surface/80 lg:relative lg:border-l lg:border-t-0">
            <div className="flex flex-col lg:absolute lg:inset-0">
              <DaySheet
                day={selected}
                month={month}
                today={today}
                events={selected ? (byDay.get(selected) ?? []) : (monthEvents ?? [])}
                requests={selected ? (requestsByDay.get(selected) ?? []) : (monthRequests ?? [])}
                ready={selected ? covers(selected) : loaded}
                error={schedule.isError && (selected ? !covers(selected) : !loaded)}
                onRetry={() => schedule.refetch()}
              />
            </div>
          </div>
        </div>
      </section>

      <ScheduleBoardRow today={today} />
    </div>
  );
}

// --- Calendar ---------------------------------------------------------------

function MonthGrid({
  month,
  grid,
  today,
  selected,
  byDay,
  requestsByDay,
  covers,
  dim,
  onSelect,
}: {
  month: string;
  grid: string[];
  today: string;
  selected: string | null;
  byDay: Map<string, ScheduleEvent[]>;
  requestsByDay: Map<string, ScheduleRequest[]>;
  covers: (day: string) => boolean;
  dim: boolean;
  onSelect: (day: string) => void;
}) {
  return (
    <div className="p-3 sm:p-5">
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5" aria-hidden="true">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} className="pb-1.5 text-center text-xs font-semibold text-faint">
            {weekday}
          </span>
        ))}
      </div>
      <ol className={cn("grid grid-cols-7 gap-1 transition-opacity sm:gap-1.5", dim && "opacity-60")} aria-label={`Days of ${monthLabel(month)}`}>
        {grid.map((day) => {
          const events = covers(day) ? (byDay.get(day) ?? []) : [];
          const requests = covers(day) ? (requestsByDay.get(day) ?? []) : [];
          const inMonth = monthOf(day) === month;
          const isToday = day === today;
          const isSelected = day === selected;
          return (
            <li key={day}>
              <button
                type="button"
                onClick={() => onSelect(day)}
                aria-pressed={isSelected}
                aria-current={isToday ? "date" : undefined}
                aria-label={`${parseDay(day).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}${events.length ? `, ${count(events.length, "shoot")}` : ""}${requests.length ? `, ${count(requests.length, "request")}` : ""}`}
                className={cn(
                  // Date on top, dots under it; both share the same left inset so they line up.
                  "flex h-11 w-full flex-col items-center justify-between rounded-[10px] border p-1 text-start transition-colors sm:h-14 sm:items-start sm:p-1.5 xl:h-16",
                  // Every cell keeps a 1px edge: the picked day is filled ink, today only gets an ink edge.
                  isSelected
                    ? "border-ink bg-ink"
                    : isToday
                      ? "border-ink bg-surface"
                      : inMonth
                      ? "border-rule bg-surface/90 hover:border-control"
                      : "border-transparent bg-ground/50 hover:border-rule",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-5 items-center font-mono text-[11px] tabular sm:h-6 sm:px-1 sm:text-[12px]",
                    isSelected ? "font-semibold text-ground" : isToday ? "font-semibold text-ink" : inMonth ? "text-ink" : "text-faint",
                  )}
                >
                  {Number(day.slice(8))}
                </span>
                {events.length + requests.length > 0 && <Markers events={events} requests={requests} inverted={isSelected} />}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * One dot per shoot in its status colour, and a hollow dashed dot per booking
 * request; past three, the rest as a count. A request always gets a slot.
 */
function Markers({ events, requests, inverted }: { events: ScheduleEvent[]; requests: ScheduleRequest[]; inverted: boolean }) {
  const requestSlots = Math.min(requests.length, Math.max(3 - events.length, requests.length ? 1 : 0));
  const eventSlots = Math.min(events.length, 3 - requestSlots);
  const rest = events.length + requests.length - eventSlots - requestSlots;
  return (
    <span className="flex items-center gap-1 sm:px-1 sm:pb-0.5">
      {events.slice(0, eventSlots).map((event) => (
        <span key={event.id} className="size-1.5 shrink-0 rounded-full sm:size-2" style={{ background: STATUS_TONE[event.status.value].r }} />
      ))}
      {requests.slice(0, requestSlots).map((request) => (
        <PendingDot key={`r${request.id}`} className={cn("size-1.5 sm:size-2", inverted ? "border-ground" : "border-faint")} />
      ))}
      {rest > 0 && <span className={cn("font-mono text-[10px] leading-none tabular sm:text-[11px]", inverted ? "text-ground" : "text-muted")}>+{rest}</span>}
    </span>
  );
}

// --- Day sheet --------------------------------------------------------------

/** The whole month's shoots, grouped by date, until a day is picked; then just that day. */
function DaySheet({
  day,
  month,
  today,
  events,
  requests,
  ready,
  error,
  onRetry,
}: {
  day: string | null;
  month: string;
  today: string;
  events: ScheduleEvent[];
  requests: ScheduleRequest[];
  ready: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const bookOn = day ?? (monthOf(today) === month ? today : `${month}-01`);
  const items = useMemo(() => sheetItems(events, requests), [events, requests]);

  return (
    <>
      <header className="flex items-start justify-between gap-3 border-b border-rule px-5 py-4">
        <div className="min-w-0">
          <p className="eyebrow">{day ? (day === today ? "Today" : "Day sheet") : "Whole month"}</p>
          <p className="mt-1 text-sm font-semibold text-ink">{day ? dayHeading(day, today) : monthLabel(month)}</p>
          <p className="text-xs text-muted">
            {ready ? (events.length ? count(events.length, "shoot") : "Nothing booked") : "Loading…"}
            {ready && requests.length > 0 && ` · ${count(requests.length, "request")} waiting`}
            {day && ready && " · click the date again for the whole month"}
          </p>
        </div>
        <Link
          href={newBookingHref(bookOn)}
          aria-label="Book a shoot on this day"
          title="Book a shoot on this day"
          className="flex size-9 shrink-0 items-center justify-center rounded-control border border-line bg-raised text-muted transition-colors hover:text-ink"
        >
          <CalendarPlus className="size-4" />
        </Link>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {error ? (
          <LoadError what="the schedule" onRetry={onRetry} />
        ) : !ready ? (
          <SheetSkeleton />
        ) : items.length === 0 ? (
          <EmptyState
            title={day ? "No shoots this day" : "No shoots this month"}
            className="px-4 py-10"
            action={
              <ButtonLink href={newBookingHref(bookOn)} variant="primary" size="sm" icon={<Plus className="size-4" />}>
                Book a shoot
              </ButtonLink>
            }
          >
            Book one and it lands here.
          </EmptyState>
        ) : (
          // The whole month lists every shoot with its date inside the card; a picked day doesn't need it.
          // Requests waiting for approval sit among the shoots in date order, in dashed cards.
          <ul className="space-y-2">
            {items.map((item) =>
              item.kind === "event" ? (
                <AgendaItem key={`e${item.event.id}`} event={item.event} today={today} showDate={!day} />
              ) : (
                <RequestItem key={`r${item.request.id}`} request={item.request} today={today} showDate={!day} />
              ),
            )}
          </ul>
        )}
      </div>
    </>
  );
}

function AgendaItem({ event, today, showDate }: { event: ScheduleEvent; today: string; showDate?: boolean }) {
  const tone = STATUS_TONE[event.status.value];
  return (
    <li>
      <Link href={`/projects/${event.id}`} className="group flex gap-3 rounded-[12px] border border-rule bg-ground/40 p-3 transition-colors hover:border-control">
        <span className="w-1 shrink-0 self-stretch rounded-full" style={{ background: tone.r }} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.06em] tabular">
            <span className="flex items-center gap-1.5 text-muted">
              <Clock className="size-3 text-faint" aria-hidden="true" />
              {event.time ? shootTime(event.date, event.time) : "All day"}
            </span>
            {showDate && <span className={cn("shrink-0", event.date === today ? "font-semibold text-accent" : "text-faint")}>{dayShort(event.date, today)}</span>}
          </div>
          <p className="mt-1 truncate text-[13px] font-semibold text-ink group-hover:underline group-hover:underline-offset-2">{event.title}</p>
          <p className="truncate text-xs text-muted">
            {event.client?.name ?? "No client"}
            {event.category && ` · ${event.category}`}
          </p>
          {event.location && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
              <MapPin className="size-3 shrink-0 text-faint" aria-hidden="true" />
              <span className="truncate">{event.location}</span>
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={eventStatus(event)} />
            <PaymentBadge percent={event.paid_percent} />
            {!event.has_photos_folder && <Pill>No photos yet</Pill>}
          </div>
        </div>
      </Link>
    </li>
  );
}

type SheetItem = { kind: "event"; event: ScheduleEvent } | { kind: "request"; request: ScheduleRequest };

/** Shoots and requests in one list: by date, then time (nulls last), then title or name. */
function sheetItems(events: ScheduleEvent[], requests: ScheduleRequest[]): SheetItem[] {
  const key = (item: SheetItem) => {
    const { date, time } = item.kind === "event" ? item.event : item.request;
    return [date, time ?? "99:99", item.kind === "event" ? item.event.title : item.request.name] as const;
  };
  return [...events.map((event) => ({ kind: "event", event }) as const), ...requests.map((request) => ({ kind: "request", request }) as const)].sort((a, b) => {
    const [ad, at, an] = key(a);
    const [bd, bt, bn] = key(b);
    return ad.localeCompare(bd) || at.localeCompare(bt) || an.localeCompare(bn);
  });
}

/** A booking request that isn't a project yet: dashed card, contact details, Accept or Decline. */
function RequestItem({ request, today, showDate }: { request: ScheduleRequest; today: string; showDate?: boolean }) {
  return (
    <li className="flex gap-3 rounded-[12px] border border-dashed border-control bg-surface p-3">
      <PendingDot className="w-1 self-stretch border-faint" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.06em] tabular">
          <span className="flex items-center gap-1.5 text-muted">
            <Clock className="size-3 text-faint" aria-hidden="true" />
            {request.time ? shootTime(request.date, request.time) : "No time set"}
          </span>
          {showDate && <span className={cn("shrink-0", request.date === today ? "font-semibold text-accent" : "text-faint")}>{dayShort(request.date, today)}</span>}
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-2">
          <Link href={`/bookings/${request.id}`} className="block min-w-0 truncate text-[13px] font-semibold text-ink hover:underline hover:underline-offset-2">{request.name}</Link>
          {request.has_payment_proof && <DpProofPill />}
        </div>
        <p className="truncate text-xs text-muted">{request.category ?? "No category"}</p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
          <MapPin className="size-3 shrink-0 text-faint" aria-hidden="true" />
          <span className="truncate">{request.location}</span>
        </p>
        {request.phone && (
          <a href={`tel:${request.phone}`} className="mt-0.5 flex w-fit max-w-full items-center gap-1 text-xs text-muted hover:text-ink">
            <Phone className="size-3 shrink-0 text-faint" aria-hidden="true" />
            <span className="truncate">{request.phone}</span>
          </a>
        )}
        <a href={`mailto:${request.email}`} className="mt-0.5 flex w-fit max-w-full items-center gap-1 text-xs text-muted hover:text-ink">
          <Mail className="size-3 shrink-0 text-faint" aria-hidden="true" />
          <span className="truncate">{request.email}</span>
        </a>
        {request.notes && <p className="mt-1.5 line-clamp-2 text-xs text-faint" title={request.notes}>{request.notes}</p>}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <RequestStatusBadge status="pending" />
          <RequestActions request={request} />
        </div>
      </div>
    </li>
  );
}

/** Copies the public booking form's link (`GET /booking-link`). */
function CopyBookingLink() {
  useBookingLink();
  const { copy, copied } = useCopyBookingLink({ announce: true });
  return (
    <IconButton label={copied ? "Booking link copied" : "Copy booking link"} onClick={copy}>
      {copied ? <Check className="size-4 text-positive" strokeWidth={2.5} /> : <Link2 className="size-4" />}
    </IconButton>
  );
}

function SheetSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-[12px] border border-rule p-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <Skeleton className="mt-1.5 h-3 w-1/2" />
          <div className="mt-2.5 flex gap-1.5">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-5 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-9 items-center justify-center rounded-control border border-line bg-surface text-muted transition-colors hover:bg-raised hover:text-ink"
    >
      {children}
    </button>
  );
}
