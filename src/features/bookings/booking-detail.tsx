"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CalendarDays, Clock, Mail, MapPin, MessageCircle, Phone, Receipt, Tag, UserRound } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, LoadError } from "@/components/ui/notice";
import { Pill, StatusBadge } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { dateTime, relative } from "@/lib/format";
import type { BookingRequest, Status } from "@/lib/types";
import { useTitle } from "@/lib/use-title";
import { AnswerList, FileLinks, hasAnswers } from "@/features/booking-form/answers-view";
import { fileSize } from "@/features/booking-form/files";
import { shootTime } from "@/features/schedule/dates";
import { PendingDot, RequestActions, RequestStatusBadge, requestWhen } from "./request-actions";

interface BookingDetail {
  request: BookingRequest;
  same_day: {
    projects: { id: number; title: string; client_name: string | null; time: string | null; location: string | null; status: Status }[];
    requests: { id: number; name: string; time: string | null; location: string }[];
  };
  history: BookingRequest[];
}

const GRID_BACKGROUND =
  "pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(var(--rule)_1px,transparent_1px),linear-gradient(90deg,var(--rule)_1px,transparent_1px)] [background-size:44px_44px]";

/** wa.me link for a phone number; local numbers starting with 0 are taken as Indonesian (08… → 628…). */
function whatsapp(phone: string | null): string | null {
  const digits = (phone ?? "").replace(/\D+/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits.startsWith("0") ? `62${digits.slice(1)}` : digits}`;
}

/** One booking request: what was asked for, who asked, and what else is on that day. */
export function BookingDetailScreen({ id }: { id: string }) {
  const detail = useQuery({
    // Under "booking-requests", so accepting or declining (which refresh that key) refreshes this too.
    queryKey: ["booking-requests", "detail", id],
    queryFn: () => api.get<BookingDetail>(`/booking-requests/${id}`),
  });
  useTitle(detail.data ? `${detail.data.request.name} · Booking` : "Booking");

  if (detail.isPending) {
    return (
      <div className="px-4 pb-10 pt-5 sm:px-6 lg:px-10">
        <Skeleton className="h-[150px] w-full rounded-board" />
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Skeleton className="h-72 rounded-card" />
          <Skeleton className="h-72 rounded-card" />
        </div>
      </div>
    );
  }

  if (detail.isError) {
    const status = detail.error instanceof ApiError ? detail.error.status : 0;
    return (
      <div className="px-4 pb-10 pt-5 sm:px-6 lg:px-10">
        {status === 403 || status === 404 ? (
          <EmptyState title="Booking not found">It may have been removed, or it belongs to another account.</EmptyState>
        ) : (
          <LoadError what="this booking" onRetry={() => detail.refetch()} />
        )}
      </div>
    );
  }

  const { request, same_day: sameDay, history } = detail.data;
  const wa = whatsapp(request.phone);
  const clashes = sameDay.projects.length + sameDay.requests.length;
  const proof = request.payment_proof ?? null;

  return (
    <div className="px-4 pb-10 pt-5 sm:px-6 lg:px-10">
      {/* The board: who and when on the left, the decision on the right. */}
      <section className="relative overflow-hidden rounded-board border border-line bg-surface">
        <div aria-hidden="true" className={GRID_BACKGROUND} />
        <div className="relative flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <nav aria-label="Breadcrumb" className="eyebrow flex items-center gap-1.5">
              <Link href="/bookings" className="hover:text-ink">
                Bookings
              </Link>
              <span aria-hidden="true">/</span>
              <span>Request {String(request.id).padStart(3, "0")}</span>
            </nav>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 className="min-w-0 truncate text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">{request.name}</h1>
              <RequestStatusBadge status={request.status} />
            </div>
            <p className="mt-0.5 text-[13px] text-muted">
              {requestWhen(request.shoot_date, request.shoot_time)} · {request.location}
            </p>
            <p className="mt-0.5 text-xs text-faint" title={dateTime(request.created_at)}>
              Requested {relative(request.created_at)}
              {request.reviewed_at && ` · reviewed ${relative(request.reviewed_at)}`}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {request.status === "pending" && <RequestActions request={request} />}
            {request.status === "accepted" && request.project && (
              <ButtonLink href={`/projects/${request.project.id}`} variant="primary" size="sm" icon={<ArrowUpRight className="size-4" />}>
                Open project
              </ButtonLink>
            )}
          </div>
        </div>

        {/* What happened to it, in one quiet row. */}
        {request.status !== "pending" && (
          <div className="relative flex items-start gap-2.5 border-t border-rule bg-surface/80 px-5 py-3 text-[13px]">
            <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", request.status === "accepted" ? "bg-status-completed" : "bg-status-expired")} aria-hidden="true" />
            {request.status === "accepted" ? (
              <p className="text-muted">
                Accepted and booked as{" "}
                {request.project ? (
                  <Link href={`/projects/${request.project.id}`} className="font-medium text-ink hover:underline">
                    {request.project.title}
                  </Link>
                ) : (
                  "a project that was since deleted"
                )}
                .
              </p>
            ) : (
              <p className="text-muted">
                Declined{request.decline_reason ? <>: <span className="text-ink">{request.decline_reason}</span></> : " without a reason."}
              </p>
            )}
          </div>
        )}
      </section>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          {proof && (
            <Deck
              title="Payment proof"
              aside={
                request.deposit_percent != null ? (
                  <Pill tone="warning">
                    <Receipt className="size-3" aria-hidden="true" />
                    DP {request.deposit_percent}% required
                  </Pill>
                ) : undefined
              }
            >
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
                <FileLinks files={[proof]} size="lg" />
                <div className="min-w-0 text-[13px]">
                  <p className="break-all font-medium text-ink">{proof.name}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-faint tabular">{fileSize(proof.size)}</p>
                  <p className="mt-2 text-muted">
                    {request.status === "pending"
                      ? "Check the transfer before you accept; the amount you confirm goes on the project."
                      : "Uploaded by the client with the request."}
                  </p>
                  <a href={proof.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-medium text-ink hover:underline">
                    Open full size <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </Deck>
          )}

          <Deck title="Shoot">
            <dl className="divide-y divide-rule">
              <Fact icon={CalendarDays} term="Date">
                {requestWhen(request.shoot_date, null)}
              </Fact>
              <Fact icon={Clock} term="Time">
                {request.shoot_time ? shootTime(request.shoot_date, request.shoot_time) : <span className="text-muted">Not given</span>}
              </Fact>
              <Fact icon={MapPin} term="Location">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(request.location)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline hover:underline-offset-2"
                >
                  {request.location}
                </a>
              </Fact>
              <Fact icon={Tag} term="Category">
                {request.category ?? <span className="text-muted">None</span>}
              </Fact>
            </dl>
            <div className="border-t border-rule px-5 py-4">
              <p className="eyebrow">Notes</p>
              <p className={cn("mt-1.5 whitespace-pre-line text-[13px]", request.notes ? "text-ink" : "text-muted")}>{request.notes || "No notes."}</p>
            </div>
          </Deck>

          {hasAnswers(request.answer_snapshot, request.files) && (
            <Deck title="Form answers">
              <AnswerList snapshot={request.answer_snapshot} files={request.files} className="px-5 py-4" />
            </Deck>
          )}

          <Deck title="Contact">
            <dl className="divide-y divide-rule">
              <Fact icon={UserRound} term="Name">
                {request.name}
                {request.client && (
                  <Link href={`/clients/${request.client.id}`} className="ms-2 rounded-chip bg-raised px-1.5 py-0.5 text-[11px] font-medium text-muted hover:text-ink">
                    Existing client
                  </Link>
                )}
              </Fact>
              <Fact icon={Mail} term="Email">
                <a href={`mailto:${request.email}`} className="hover:underline hover:underline-offset-2">
                  {request.email}
                </a>
              </Fact>
              <Fact icon={Phone} term="Phone">
                {request.phone ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <a href={`tel:${request.phone}`} className="hover:underline hover:underline-offset-2">
                      {request.phone}
                    </a>
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-chip bg-raised px-1.5 py-0.5 text-[11px] font-medium text-muted hover:text-ink"
                      >
                        <MessageCircle className="size-3" /> WhatsApp
                      </a>
                    )}
                  </span>
                ) : (
                  <span className="text-muted">Not given</span>
                )}
              </Fact>
            </dl>
          </Deck>
        </div>

        <div className="space-y-4">
          <Deck title="Same day" count={clashes}>
            {clashes === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-muted">Nothing else booked on this day.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {sameDay.projects.map((project) => (
                  <li key={`p${project.id}`}>
                    <Link href={`/projects/${project.id}`} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-raised">
                      <span className="w-14 shrink-0 font-mono text-[11px] text-muted tabular">
                        {project.time ? shootTime(request.shoot_date, project.time) : "All day"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">{project.title}</span>
                        <span className="block truncate text-xs text-muted">
                          {[project.client_name, project.location].filter(Boolean).join(" · ") || "Project"}
                        </span>
                      </span>
                      <StatusBadge status={project.status} />
                    </Link>
                  </li>
                ))}
                {sameDay.requests.map((other) => (
                  <li key={`r${other.id}`}>
                    <Link href={`/bookings/${other.id}`} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-raised">
                      <span className="w-14 shrink-0 font-mono text-[11px] text-muted tabular">
                        {other.time ? shootTime(request.shoot_date, other.time) : "All day"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">{other.name}</span>
                        <span className="block truncate text-xs text-muted">{other.location}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
                        <PendingDot className="size-2 border-faint" /> Request
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Deck>

          <Deck title="Other requests from this email" count={history.length}>
            {history.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-muted">This is their first request.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {history.map((other) => (
                  <li key={other.id}>
                    <Link href={`/bookings/${other.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-raised">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">{requestWhen(other.shoot_date, other.shoot_time)}</span>
                        <span className="block truncate text-xs text-muted">
                          {[other.category, other.location].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <RequestStatusBadge status={other.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Deck>
        </div>
      </div>
    </div>
  );
}

function Deck({ title, count, aside, children }: { title: string; count?: number; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-card border border-line bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-rule px-5 py-3.5">
        <h2 className="deck-title">{title}</h2>
        {aside}
        {count !== undefined && (
          <span className="min-w-8 rounded-[8px] bg-raised px-2 py-0.5 text-center font-mono text-xs text-ink tabular">{count}</span>
        )}
      </header>
      {children}
    </section>
  );
}

function Fact({ icon: Icon, term, children }: { icon: typeof MapPin; term: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden="true" />
      <dt className="w-24 shrink-0 text-[13px] text-muted">{term}</dt>
      <dd className="min-w-0 flex-1 break-words text-[13px] text-ink">{children}</dd>
    </div>
  );
}
