"use client";

import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/feedback";
import { Field, Textarea } from "@/components/ui/field";
import { PaymentSlider } from "@/components/ui/payment";
import { Pill } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { BookingRequest, BookingRequestStatus } from "@/lib/types";
import { FileLinks } from "@/features/booking-form/answers-view";
import type { BookingFile } from "@/features/booking-form/schema";
import { parseDay, shootTime, todayDay } from "@/features/schedule/dates";
import { useAcceptRequest, useDeclineRequest } from "./use-bookings";

/** "Sat, Nov 14 · 2:30 PM", with the year outside this one. */
export function requestWhen(date: string, time: string | null): string {
  const options: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  if (date.slice(0, 4) !== todayDay().slice(0, 4)) options.year = "numeric";
  const day = parseDay(date).toLocaleDateString("en-US", options);
  return time ? `${day} · ${shootTime(date, time)}` : day;
}

/** The marker for a request that isn't a project yet: a hollow, dashed dot. */
export function PendingDot({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("shrink-0 rounded-full border border-dashed", className)} />;
}

const STATUS_BADGE: Record<BookingRequestStatus, { label: string; className: string }> = {
  pending: { label: "Waiting for approval", className: "bg-status-draft-soft text-muted" },
  accepted: { label: "Accepted", className: "bg-status-completed-soft text-status-completed" },
  declined: { label: "Declined", className: "bg-status-expired-soft text-status-expired" },
};

/** A request's state as a tag, in the payment badge's shape. */
export function RequestStatusBadge({ status, className }: { status: BookingRequestStatus; className?: string }) {
  const badge = STATUS_BADGE[status];
  return (
    <span className={cn("inline-flex h-5 w-fit flex-none items-center gap-1.5 whitespace-nowrap rounded-chip px-2 text-[11px] font-medium", badge.className, className)}>
      {status === "pending" && <PendingDot className="size-2 border-faint" />}
      {badge.label}
    </span>
  );
}

/** "DP proof": the visitor uploaded a down-payment proof with the request. */
export function DpProofPill({ className }: { className?: string }) {
  return (
    <Pill tone="warning" className={className}>
      <Receipt className="size-3" aria-hidden="true" />
      DP proof
    </Pill>
  );
}

/**
 * What RequestActions needs. `payment_proof` / `deposit_percent` come with
 * full requests; when they're missing (schedule cards), the accept dialog
 * fetches the request, unless `has_payment_proof` already says there's none.
 */
export interface ActionableRequest {
  id: number;
  name: string;
  payment_proof?: BookingFile | null;
  deposit_percent?: number | null;
  has_payment_proof?: boolean;
}

/** Accept (asks how much is paid, then books a project) and Decline (asks for an optional reason) for one pending request. */
export function RequestActions({ request, className }: { request: ActionableRequest; className?: string }) {
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Button variant="primary" size="sm" onClick={() => setAccepting(true)} aria-label={`Accept ${request.name}'s request`}>
        Accept
      </Button>
      <Button size="sm" onClick={() => setDeclining(true)} aria-label={`Decline ${request.name}'s request`}>
        Decline
      </Button>
      {accepting && <AcceptDialog request={request} onClose={() => setAccepting(false)} />}
      <DeclineDialog request={request} open={declining} onClose={() => setDeclining(false)} />
    </div>
  );
}

/** Mounted only while open, so the slider starts from the request's default each time. */
function AcceptDialog({ request, onClose }: { request: ActionableRequest; onClose: () => void }) {
  const accept = useAcceptRequest();
  // The request's proof: as given, or fetched (shared with the detail page's cache) when not given.
  const known = request.payment_proof !== undefined || request.has_payment_proof === false;
  const detail = useQuery({
    queryKey: ["booking-requests", "detail", String(request.id)],
    queryFn: () => api.get<{ request: BookingRequest }>(`/booking-requests/${request.id}`),
    enabled: !known,
    staleTime: 30_000,
  });
  const loading = !known && detail.isPending;
  const proof = known ? (request.payment_proof ?? null) : (detail.data?.request.payment_proof ?? null);
  const deposit = known ? request.deposit_percent : detail.data?.request.deposit_percent;
  const fallback = proof ? Math.max(0, Math.min(100, deposit ?? 0)) : 0;
  const [chosen, setChosen] = useState<number | null>(null);
  const percent = chosen ?? fallback;

  const confirm = () =>
    accept.mutate(
      { id: request.id, paid_percent: percent },
      // Errors are toasted by the hook; the refreshed lists show the truth either way.
      { onSettled: onClose },
    );

  return (
    <Dialog
      open
      onClose={() => !accept.isPending && onClose()}
      title={`Accept ${request.name}'s request?`}
      description="This books a project for the shoot, and adds them as a client if they're new."
      size="sm"
      footer={
        <>
          <Button onClick={onClose} disabled={accept.isPending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirm} loading={accept.isPending} disabled={loading}>
            Accept and book
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {loading ? (
          <Skeleton className="h-24 w-full rounded-control" />
        ) : proof ? (
          <div className="rounded-control border border-line p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] font-medium text-ink">Payment proof</p>
              {deposit != null && <Pill tone="warning">DP {deposit}% required</Pill>}
            </div>
            <FileLinks files={[proof]} className="mt-2.5" />
          </div>
        ) : (
          !detail.isError && <p className="text-[13px] text-muted">No payment proof was uploaded with this request.</p>
        )}
        <PaymentSlider value={percent} onChange={setChosen} disabled={accept.isPending} />
      </div>
    </Dialog>
  );
}

function DeclineDialog({ request, open, onClose }: { request: { id: number; name: string }; open: boolean; onClose: () => void }) {
  const formId = useId();
  const toast = useToast();
  const decline = useDeclineRequest();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();

  const close = () => {
    setError(undefined);
    onClose();
  };

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    decline.mutate(
      { id: request.id, reason: reason.trim() },
      {
        onSuccess: () => {
          setReason("");
          close();
        },
        onError: (failure) => {
          const field = failure instanceof ApiError ? failure.field("reason") : undefined;
          if (field) return setError(field);
          // Already reviewed, or something else: say so and let the refreshed list show the truth.
          toast(failure instanceof ApiError ? failure.message : "Couldn't decline the request.", "error");
          close();
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={`Decline ${request.name}'s request?`}
      description="Nothing gets booked. They see the request as declined when they look it up."
      size="sm"
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="danger" type="submit" form={formId} loading={decline.isPending}>
            Decline request
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate>
        <Field label="Reason (optional)" hint="Shown to the client with the request." error={error}>
          {(id) => (
            <Textarea
              id={id}
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. I'm already booked that day."
              invalid={!!error}
              autoFocus
            />
          )}
        </Field>
      </form>
    </Dialog>
  );
}
