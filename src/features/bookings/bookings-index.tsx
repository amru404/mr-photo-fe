"use client";

import Link from "next/link";
import { useEffect } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Check, Copy, Link2, RefreshCw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, LoadError } from "@/components/ui/notice";
import { Skeleton, Spinner } from "@/components/ui/spinner";
import { TABLE_HEAD } from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { count, relative } from "@/lib/format";
import type { BookingRequest, BookingRequestList } from "@/lib/types";
import { useQueryState } from "@/lib/use-query-state";
import { useTitle } from "@/lib/use-title";
import { Chip, ChipCount, Pager } from "@/features/projects/projects-index";
import { DpProofPill, PendingDot, RequestActions, RequestStatusBadge, requestWhen } from "./request-actions";
import {
  bookingListKey,
  fetchBookingList,
  useBookingLink,
  useCopyBookingLink,
  useRegenerateBookingLink,
  type BookingFilter,
} from "./use-bookings";

const FILTERS: { value: BookingFilter; label: string; heading: string }[] = [
  { value: "pending", label: "Pending", heading: "Waiting for approval" },
  { value: "accepted", label: "Accepted", heading: "Accepted requests" },
  { value: "declined", label: "Declined", heading: "Declined requests" },
  { value: "all", label: "All", heading: "Every booking request" },
];

const COLUMNS = "md:grid-cols-[minmax(0,1.4fr)_120px_minmax(0,1fr)_minmax(0,1fr)_150px_190px]";

function isFilter(value: string): value is BookingFilter {
  return FILTERS.some((filter) => filter.value === value);
}

function filterCount(counts: BookingRequestList["counts"], filter: BookingFilter): number {
  return filter === "all" ? counts.pending + counts.accepted + counts.declined : counts[filter];
}

export function BookingsIndex() {
  useTitle("Bookings");
  const url = useQueryState();
  const statusParam = url.get("status", "pending");
  const status: BookingFilter = isFilter(statusParam) ? statusParam : "pending";
  const page = Number(url.get("page", "1")) || 1;
  const setStatus = (value: BookingFilter) => url.set({ status: value, page: null }, { defaults: { status: "pending" } });

  const list = useQuery({
    queryKey: bookingListKey(status, page),
    queryFn: () => fetchBookingList(status, page),
    placeholderData: keepPreviousData,
  });

  // Accepting or declining the last row of a later page leaves it empty: step back.
  const lastPage = list.data?.meta.last_page ?? 1;
  const emptyPage = !!list.data && !list.isPlaceholderData && list.data.data.length === 0 && page > 1;
  useEffect(() => {
    if (emptyPage) url.set({ page: lastPage > 1 ? Math.min(page - 1, lastPage) : null });
  }, [emptyPage]);

  const heading = FILTERS.find((filter) => filter.value === status)!.heading;

  return (
    <div className="px-4 pb-10 pt-5 sm:px-6 lg:px-10">
      {/* Toolbar: status chips like the Projects index. */}
      <div className="no-scrollbar overflow-x-auto">
        <div role="group" aria-label="Filter by status" className="inline-flex items-center gap-1 rounded-[12px] border border-line bg-surface p-1">
          {FILTERS.map((filter) => (
            <Chip key={filter.value} on={status === filter.value} onClick={() => setStatus(filter.value)}>
              {filter.value === "pending" && <PendingDot className={cn("size-2", status === "pending" ? "border-ground" : "border-faint")} />}
              {filter.value === "accepted" && <span className="size-2 rounded-full bg-status-completed" />}
              {filter.value === "declined" && <span className="size-2 rounded-full bg-status-expired" />}
              {filter.label}
              {list.data?.counts && <ChipCount on={status === filter.value}>{filterCount(list.data.counts, filter.value)}</ChipCount>}
            </Chip>
          ))}
        </div>
      </div>

      <section className="relative mt-4 overflow-hidden rounded-[20px] border border-line bg-surface">
        <header className="flex flex-col gap-4 border-b border-rule p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">Bookings</p>
            <p className="mt-1 text-sm font-semibold text-ink">{heading}</p>
            <p className="truncate text-xs text-muted">{list.data ? count(list.data.meta.total, "request") : "Loading…"}</p>
          </div>
          <BookingLinkBar />
        </header>

        {list.isPending ? (
          <RowsSkeleton />
        ) : list.isError ? (
          <div className="p-4">
            <LoadError what="your booking requests" onRetry={() => list.refetch()} />
          </div>
        ) : list.data.data.length === 0 ? (
          <div className="p-4">
            <EmptyList status={status} />
          </div>
        ) : (
          <>
            <div className={cn(TABLE_HEAD, COLUMNS)}>
              <span>Requested by</span>
              <span>Phone</span>
              <span>Shoot</span>
              <span>Location</span>
              <span>Status</span>
              <span>{status === "declined" ? "Reason" : "Actions"}</span>
            </div>
            <ul className={cn("divide-y divide-rule transition-opacity", list.isPlaceholderData && "opacity-60")}>
              {list.data.data.map((request) => (
                <RequestRow key={request.id} request={request} />
              ))}
            </ul>
            <Pager meta={list.data.meta} onPage={(next) => url.set({ page: next > 1 ? next : null })} />
          </>
        )}
      </section>
    </div>
  );
}

// --- Pieces -----------------------------------------------------------------

function RequestRow({ request }: { request: BookingRequest }) {
  const when = requestWhen(request.shoot_date, request.shoot_time);
  return (
    <li className={cn("grid gap-3 px-5 py-3.5 transition-colors hover:bg-raised md:items-center md:gap-5", COLUMNS)}>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <Link href={`/bookings/${request.id}`} className="block min-w-0 truncate text-[13px] font-semibold text-ink hover:underline hover:underline-offset-2">{request.name}</Link>
          {(request.payment_proof || request.has_payment_proof) && <DpProofPill />}
        </div>
        <a href={`mailto:${request.email}`} className="block w-fit max-w-full truncate text-xs text-muted hover:text-ink">
          {request.email}
        </a>
        {request.client && (
          <p className="truncate text-[11px] text-faint">
            Existing client ·{" "}
            <Link href={`/clients/${request.client.id}`} className="hover:text-ink hover:underline">
              {request.client.name}
            </Link>
          </p>
        )}
        {request.notes && (
          <p className="mt-0.5 truncate text-xs text-faint" title={request.notes}>
            {request.notes}
          </p>
        )}
        {/* On a phone the columns fold under the name. */}
        <div className="mt-1.5 space-y-0.5 text-xs text-muted md:hidden">
          <p className="font-mono text-[11px] tabular">
            {when}
            <span className="font-sans"> · {request.category ?? "No category"}</span>
          </p>
          <p className="truncate">{request.location}</p>
          {request.phone && <p>{request.phone}</p>}
        </div>
      </div>

      <span className="hidden truncate text-[13px] text-ink md:block">
        {request.phone ? (
          <a href={`tel:${request.phone}`} className="hover:underline">
            {request.phone}
          </a>
        ) : (
          <span className="text-faint">—</span>
        )}
      </span>
      <div className="hidden min-w-0 md:block">
        <p className="truncate font-mono text-[11px] text-ink tabular">{when}</p>
        <p className="truncate text-xs text-muted">{request.category ?? "No category"}</p>
      </div>
      <span className="hidden truncate text-xs text-muted md:block" title={request.location}>
        {request.location}
      </span>
      <span className="hidden md:block">
        <RequestStatusBadge status={request.status} />
        {request.reviewed_at && <span className="mt-1 block text-[11px] text-faint">{relative(request.reviewed_at)}</span>}
      </span>

      <div className="flex flex-wrap items-center justify-between gap-2 md:block">
        <RequestStatusBadge status={request.status} className="md:hidden" />
        <RowOutcome request={request} />
      </div>
    </li>
  );
}

/** Pending: Accept or Decline. Accepted: its project. Declined: the reason given. */
function RowOutcome({ request }: { request: BookingRequest }) {
  if (request.status === "pending") return <RequestActions request={request} />;
  if (request.status === "accepted")
    return request.project ? (
      <ButtonLink href={`/projects/${request.project.id}`} size="sm" icon={<ArrowUpRight className="size-4" />} title={request.project.title}>
        Open project
      </ButtonLink>
    ) : (
      <span className="text-xs text-faint">Project deleted</span>
    );
  return request.decline_reason ? (
    <p className="line-clamp-2 text-xs text-muted" title={request.decline_reason}>
      {request.decline_reason}
    </p>
  ) : (
    <span className="text-xs text-faint">No reason given</span>
  );
}

/** The public form's link, with Copy and "New link" (which retires the old one). */
function BookingLinkBar() {
  const link = useBookingLink();
  const { copy, copied } = useCopyBookingLink();
  const { regenerate, pending } = useRegenerateBookingLink();
  const shown = link.data?.url.replace(/^https?:\/\//, "");

  return (
    <div className="flex min-w-0 items-center gap-2 lg:w-[440px]">
      <div className="flex h-[42px] min-w-0 flex-1 items-center gap-2 rounded-[12px] border border-line bg-ground/40 ps-3 pe-1">
        <Link2 className="size-4 shrink-0 text-faint" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted" title={link.data?.url}>
          {shown ?? (link.isError ? "Couldn't load your link" : "Loading…")}
        </span>
        <button
          type="button"
          onClick={copy}
          disabled={!link.data}
          aria-label={copied ? "Booking link copied" : "Copy booking link"}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] px-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-raised disabled:opacity-50"
        >
          {copied ? <Check className="size-4 text-positive" strokeWidth={2.5} /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <button
        type="button"
        onClick={regenerate}
        disabled={pending || !link.data}
        aria-label="New booking link"
        title="New link: the current one stops working"
        className="inline-flex h-[42px] shrink-0 items-center gap-2 rounded-[12px] border border-line bg-surface px-3.5 text-[13px] font-semibold text-muted transition-colors hover:bg-raised hover:text-ink disabled:opacity-50"
      >
        {pending ? <Spinner className="size-4" /> : <RefreshCw className="size-4" />}
        <span className="hidden sm:inline">New link</span>
      </button>
    </div>
  );
}

function EmptyList({ status }: { status: BookingFilter }) {
  const { copy, copied } = useCopyBookingLink();
  const share = (
    <Button variant="primary" onClick={copy} icon={copied ? <Check className="size-4" strokeWidth={2.5} /> : <Link2 className="size-4" />}>
      {copied ? "Copied" : "Copy booking link"}
    </Button>
  );
  if (status === "accepted") return <EmptyState title="No accepted requests yet">Requests you accept become booked projects.</EmptyState>;
  if (status === "declined") return <EmptyState title="No declined requests">Requests you turn down show here with the reason.</EmptyState>;
  return (
    <EmptyState title={status === "pending" ? "No requests waiting" : "No booking requests yet"} action={share}>
      Share your booking link. When someone asks for a shoot, it lands here and on your schedule.
    </EmptyState>
  );
}

function RowsSkeleton() {
  return (
    <ul className="divide-y divide-rule">
      {Array.from({ length: 6 }, (_, index) => (
        <li key={index} className="flex items-center gap-4 px-5 py-3.5">
          <div className="flex-1">
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
          <Skeleton className="hidden h-5 w-28 md:block" />
          <Skeleton className="h-8 w-36" />
        </li>
      ))}
    </ul>
  );
}
