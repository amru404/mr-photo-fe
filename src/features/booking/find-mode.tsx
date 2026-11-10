"use client";

import { useState } from "react";
import { ArrowLeft, Check, ChevronDown, MapPin, Pencil, Search, SearchX, Tag } from "lucide-react";
import { Field, Input } from "@/components/ui/field";
import { ApiError } from "@/lib/api";
import { relative } from "@/lib/format";
import { ActionButton, CountPill, Note, Placeholder } from "@/features/gallery/gallery-chrome";
import { AnswerList, hasAnswers } from "@/features/booking-form/answers-view";
import { BookingForm } from "./booking-form";
import { BookingStatusBadge, Deck } from "./booking-parts";
import type { BookingInfo, PublicBookingRequest } from "./types";
import { normalizeEmail, readStoredEmail, shootDayShort, shootTime, storeEmail, useBookingLookup } from "./use-booking";

/** "Find my booking": the visitor's email is the key to their requests. */
export function FindMode({ token, info }: { token: string; info: BookingInfo }) {
  // Only mounted on the client (after the booking info loaded), so storage is safe to read here.
  const [email, setEmail] = useState(() => readStoredEmail(token));
  const [input, setInput] = useState(email);
  const [inputError, setInputError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PublicBookingRequest | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const lookup = useBookingLookup(token, email);

  function find(event: React.FormEvent) {
    event.preventDefault();
    const value = normalizeEmail(input);
    if (!value) {
      setInputError("Enter the email you used to book.");
      return;
    }
    setInputError(null);
    setSavedId(null);
    setInput(value);
    storeEmail(token, value);
    if (value === email) void lookup.refetch();
    else setEmail(value);
  }

  function clearEmail() {
    storeEmail(token, "");
    setEmail("");
    setInput("");
    setSavedId(null);
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEditing(null)}
            aria-label="Back to my bookings"
            className="flex size-10 shrink-0 items-center justify-center rounded-control border border-line bg-surface text-muted transition-colors hover:bg-raised hover:text-ink"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="min-w-0">
            <p className="eyebrow">Edit booking</p>
            <p className="truncate text-[14px] font-semibold text-ink">{shootDayShort(editing.shoot_date)}</p>
          </div>
        </div>
        <BookingForm
          key={editing.id}
          token={token}
          info={info}
          request={editing}
          onCancel={() => setEditing(null)}
          onSaved={(request) => {
            setEditing(null);
            setSavedId(request.id);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </div>
    );
  }

  const lookupError =
    lookup.error instanceof ApiError
      ? lookup.error.status === 429
        ? "Too many attempts. Please wait a minute and try again."
        : (lookup.error.field("email") ?? lookup.error.message)
      : lookup.error
        ? "We couldn't reach the studio. Check your connection and try again."
        : null;
  const requests = lookup.data;

  return (
    <div className="space-y-4">
      <Deck title="Find my booking" text="Enter the email you booked with to see your requests and change any that are still waiting.">
        <form onSubmit={find} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <Field label="Email" error={inputError ?? lookupError ?? undefined} className="min-w-0 flex-1">
            {(id) => (
              <Input
                id={id}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setInputError(null);
                }}
                invalid={!!(inputError ?? lookupError)}
              />
            )}
          </Field>
          {/* The label's height again, so the button lines up with the input beside it. */}
          <div className="sm:pt-7">
            <ActionButton type="submit" loading={lookup.isFetching} icon={<Search className="size-4" aria-hidden="true" />} className="w-full sm:w-auto">
              Find bookings
            </ActionButton>
          </div>
        </form>
      </Deck>

      {email && lookup.isPending && !lookupError && (
        <div className="space-y-3" aria-busy="true">
          <Placeholder className="h-36 w-full rounded-card" />
          <Placeholder className="h-36 w-full rounded-card" />
        </div>
      )}

      {email && requests && (
        <section aria-labelledby="booking-results" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1">
            <h2 id="booking-results" className="deck-title flex min-w-0 items-center gap-2">
              <span className="truncate">Bookings for {email}</span>
              <CountPill>{requests.length}</CountPill>
            </h2>
            <button type="button" onClick={clearEmail} className="text-[13px] font-medium text-muted underline-offset-4 hover:text-ink hover:underline">
              Use another email
            </button>
          </div>

          {savedId !== null && (
            <Note tone="positive" icon={<Check />}>
              Your changes were saved. The booking is still waiting for {info.studio.name} to approve.
            </Note>
          )}

          {requests.length === 0 ? (
            <div className="rounded-card border border-dashed border-line bg-surface px-5 py-10 text-center">
              <span className="mx-auto flex size-10 items-center justify-center rounded-control bg-raised text-muted">
                <SearchX className="size-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <p className="mt-4 text-[14px] font-semibold text-ink">No bookings found for this email</p>
              <p className="mx-auto mt-1 max-w-xs text-[13px] text-muted">Check the spelling, or try the email you used when you sent the request.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {requests.map((request) => (
                <li key={request.id}>
                  <RequestCard request={request} highlight={request.id === savedId} onEdit={() => setEditing(request)} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function RequestCard({ request, highlight, onEdit }: { request: PublicBookingRequest; highlight: boolean; onEdit: () => void }) {
  const at = shootTime(request.shoot_time);
  const pending = request.status === "pending";

  return (
    <article className={highlight ? "rounded-card border border-ink bg-surface" : "rounded-card border border-line bg-surface"}>
      <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold leading-5 tracking-[-0.01em] text-ink">{shootDayShort(request.shoot_date)}</h3>
          <p className="mt-0.5 font-mono text-xs text-muted tabular">{at ?? "Time not set"}</p>
        </div>
        <BookingStatusBadge request={request} />
      </div>

      <ul className="mt-3 space-y-1.5 px-4 text-[13px] text-muted sm:px-5">
        <li className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-faint" aria-hidden="true" />
          <span className="min-w-0 break-words">{request.location}</span>
        </li>
        {request.category && (
          <li className="flex items-start gap-2">
            <Tag className="mt-0.5 size-3.5 shrink-0 text-faint" aria-hidden="true" />
            <span className="min-w-0 break-words">{request.category}</span>
          </li>
        )}
      </ul>

      {hasAnswers(request.answer_snapshot, request.files) && (
        <details className="group mx-4 mt-3 rounded-control border border-line sm:mx-5">
          <summary className="flex h-10 cursor-pointer list-none items-center justify-between gap-2 px-3 text-[13px] font-medium text-ink [&::-webkit-details-marker]:hidden">
            Your answers
            <ChevronDown className="size-4 text-faint transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="border-t border-rule px-3 py-3">
            <AnswerList snapshot={request.answer_snapshot} files={request.files} />
          </div>
        </details>
      )}

      {request.status === "declined" && (
        <div className="mx-4 mt-3 rounded-control bg-status-expired-soft px-3 py-2 text-[13px] leading-5 text-status-expired sm:mx-5">
          {request.decline_reason ? (
            <>
              <span className="font-semibold">Reason:</span> <span className="whitespace-pre-line break-words">{request.decline_reason}</span>
            </>
          ) : (
            "The studio couldn't take this booking."
          )}
        </div>
      )}

      <div className="mt-4 flex min-h-12 items-center justify-between gap-3 border-t border-rule px-4 py-2 sm:px-5">
        <p className="min-w-0 truncate text-xs text-faint">
          {request.status === "accepted" ? "Confirmed by the studio" : `Requested ${relative(request.created_at)}`}
        </p>
        {pending && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-[13px] font-semibold text-ink transition-colors hover:bg-raised"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            Edit
          </button>
        )}
      </div>
    </article>
  );
}
