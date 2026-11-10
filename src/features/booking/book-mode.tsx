"use client";

import { Clock, Pencil, Plus, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { ActionButton, Board, BOARD_TITLE, Note } from "@/features/gallery/gallery-chrome";
import { AnswerList, hasAnswers } from "@/features/booking-form/answers-view";
import { BookingForm } from "./booking-form";
import { BookingStatusBadge, RequestSummary } from "./booking-parts";
import type { BookingInfo, PublicBookingRequest } from "./types";

/** Where "Book a shoot" is: filling the form, looking at what was sent, or changing it. */
export type BookState =
  | { step: "form" }
  | { step: "sent"; request: PublicBookingRequest; updated?: boolean }
  | { step: "edit"; request: PublicBookingRequest };

export function BookMode({
  token,
  info,
  state,
  onChange,
  onFind,
}: {
  token: string;
  info: BookingInfo;
  state: BookState;
  onChange: (state: BookState) => void;
  onFind: () => void;
}) {
  const go = (next: BookState) => {
    onChange(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (state.step === "sent") {
    return (
      <Confirmation
        studio={info.studio.name}
        request={state.request}
        updated={state.updated}
        onEdit={() => go({ step: "edit", request: state.request })}
        onFind={onFind}
        onAnother={() => go({ step: "form" })}
      />
    );
  }

  if (state.step === "edit") {
    return (
      <BookingForm
        key={`edit-${state.request.id}`}
        token={token}
        info={info}
        request={state.request}
        onSaved={(request) => go({ step: "sent", request, updated: true })}
        onCancel={() => go({ step: "sent", request: state.request })}
      />
    );
  }

  return <BookingForm key="new" token={token} info={info} onSaved={(request) => go({ step: "sent", request })} />;
}

function Confirmation({
  studio,
  request,
  updated,
  onEdit,
  onFind,
  onAnother,
}: {
  studio: string;
  request: PublicBookingRequest;
  updated?: boolean;
  onEdit: () => void;
  onFind: () => void;
  onAnother: () => void;
}) {
  const pending = request.status === "pending";

  return (
    <div className="space-y-4">
      <Board>
        <div className="px-5 pb-6 pt-7 text-center sm:px-8">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-status-selection-soft text-status-selection">
            <Clock className="size-6" strokeWidth={2} aria-hidden="true" />
          </span>
          <p className="eyebrow mt-4">{updated ? "Changes saved" : "Request sent"}</p>
          <h2 className={cn(BOARD_TITLE, "mx-auto mt-1.5 max-w-md")} aria-live="polite">
            {updated ? "Booking updated" : "Request sent"} — waiting for {studio} to approve
          </h2>
          <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-muted">
            Nothing is confirmed until {studio} approves it. You can change the details while it's waiting.
          </p>
          <div className="mt-4 flex justify-center">
            <BookingStatusBadge request={request} />
          </div>
        </div>

        <div className="border-t border-rule bg-surface/80 px-5 py-5 sm:px-8">
          <h3 className="deck-title">Your request</h3>
          <RequestSummary request={request} className="mt-4" />
        </div>

        {hasAnswers(request.answer_snapshot, request.files) && (
          <div className="border-t border-rule bg-surface/80 px-5 py-5 sm:px-8">
            <h3 className="deck-title">{request.category ? `${request.category} details` : "Your answers"}</h3>
            <AnswerList snapshot={request.answer_snapshot} files={request.files} className="mt-4" />
          </div>
        )}
      </Board>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <ActionButton variant="secondary" icon={<Plus className="size-4" aria-hidden="true" />} onClick={onAnother} className="w-full sm:w-auto">
          Book another shoot
        </ActionButton>
        {pending && (
          <ActionButton icon={<Pencil className="size-4" aria-hidden="true" />} onClick={onEdit} className="w-full sm:w-auto">
            Edit this booking
          </ActionButton>
        )}
      </div>

      <Note icon={<Search />}>
        To check on it or make changes later, open{" "}
        <button type="button" onClick={onFind} className="font-semibold text-ink underline underline-offset-4 hover:no-underline">
          Find my booking
        </button>{" "}
        and enter the same email: <span className="break-all font-medium text-ink">{request.email}</span>.
      </Note>
    </div>
  );
}
