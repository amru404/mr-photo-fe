"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ArrowUpRight, Camera, GripVertical, Link2, MoreHorizontal } from "lucide-react";
import { useToast } from "@/components/ui/feedback";
import { LoadError } from "@/components/ui/notice";
import { PaymentBadge } from "@/components/ui/payment";
import { Skeleton } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { STATUS_TONE } from "@/lib/status-tone";
import type { ProjectStatusValue } from "@/lib/types";
import { dayShort } from "./dates";
import type { ScheduleBoard, ScheduleColumnKey, ScheduleEvent } from "./types";

/** Each column holds one project status, and wears its colour. */
const COLUMN_STATUS: Record<ScheduleColumnKey, ProjectStatusValue> = {
  booked: "draft",
  selection: "selection",
  editing: "editing",
  completed: "completed",
};

const COLUMN_EMPTY: Record<ScheduleColumnKey, string> = {
  booked: "No upcoming bookings.",
  selection: "No client is picking right now.",
  editing: "Nothing waiting to be edited.",
  completed: "Nothing delivered in the last 30 days.",
};

const BOARD_KEY = ["schedule", "board"];

interface Move {
  event: ScheduleEvent;
  from: ScheduleColumnKey;
  to: ScheduleColumnKey;
}

type MoveOption = { key: ScheduleColumnKey; label: string };

/** Moves a card between columns in the cached board, so the drop shows at once. */
function moveInBoard(board: ScheduleBoard, { event, from, to }: Move): ScheduleBoard {
  return {
    ...board,
    columns: board.columns.map((column) => {
      if (column.key === from) return { ...column, count: column.count - 1, items: column.items.filter((item) => item.id !== event.id) };
      if (column.key === to) {
        const moved = { ...event, status: { ...event.status, value: COLUMN_STATUS[to] } };
        return { ...column, count: column.count + 1, items: [moved, ...column.items] };
      }
      return column;
    }),
  };
}

/** Status changes from the board: shown at once, rolled back if the server refuses. */
function useMoveCard() {
  const client = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ event, to }: Move) => api.put(`/projects/${event.id}/status`, { status: COLUMN_STATUS[to] }),
    onMutate: async (move) => {
      await client.cancelQueries({ queryKey: BOARD_KEY });
      const previous = client.getQueryData<ScheduleBoard>(BOARD_KEY);
      if (previous) client.setQueryData(BOARD_KEY, moveInBoard(previous, move));
      return { previous };
    },
    onError: (error, _move, context) => {
      if (context?.previous) client.setQueryData(BOARD_KEY, context.previous);
      toast(error instanceof ApiError ? error.message : "Couldn't move the project.", "error");
    },
    onSuccess: (_data, { event, to }) => {
      const label = client.getQueryData<ScheduleBoard>(BOARD_KEY)?.columns.find((column) => column.key === to)?.label ?? to;
      toast(`“${event.title}” moved to ${label}.`);
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: ["schedule"] });
      client.invalidateQueries({ queryKey: ["projects"] });
      client.invalidateQueries({ queryKey: ["project"] });
      client.invalidateQueries({ queryKey: ["overview"] });
    },
  });
}

/** The four pipeline columns under the calendar. Cards drag between them to change status. */
export function ScheduleBoardRow({ today }: { today: string }) {
  const board = useQuery({
    queryKey: BOARD_KEY,
    queryFn: () => api.get<ScheduleBoard>("/schedule/board"),
    placeholderData: keepPreviousData,
  });
  const move = useMoveCard();
  const [dragging, setDragging] = useState<{ event: ScheduleEvent; from: ScheduleColumnKey } | null>(null);
  const [over, setOver] = useState<ScheduleColumnKey | null>(null);

  if (board.isPending) return <BoardSkeleton />;
  if (board.isError)
    return (
      <div className="mt-4">
        <LoadError what="the project board" onRetry={() => board.refetch()} />
      </div>
    );

  const columns = board.data.columns;
  const moveTo = (event: ScheduleEvent, from: ScheduleColumnKey, to: ScheduleColumnKey) => {
    if (from !== to) move.mutate({ event, from, to });
  };
  const endDrag = () => {
    setDragging(null);
    setOver(null);
  };

  return (
    <div className="mt-4 grid items-start gap-4 md:grid-cols-2 lg:grid-cols-4">
      {columns.map((column) => {
        const tone = STATUS_TONE[COLUMN_STATUS[column.key] ?? "draft"];
        const target = !!dragging && dragging.from !== column.key;
        const hovered = target && over === column.key;
        return (
          <section
            key={column.key}
            aria-label={column.label}
            onDragOver={(e) => {
              if (!target) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (over !== column.key) setOver(column.key);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver((key) => (key === column.key ? null : key));
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragging) moveTo(dragging.event, dragging.from, column.key);
              endDrag();
            }}
            className={cn(
              "flex flex-col rounded-card border bg-surface transition-[border-color,box-shadow]",
              hovered ? "border-accent bg-raised/40" : target ? "border-dashed border-control" : "border-line",
            )}
          >
            <header className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
              <span className="flex min-w-0 items-center gap-2">
                <span className="size-2 shrink-0 rounded-full" style={{ background: tone.r }} aria-hidden="true" />
                <h2 className="deck-title truncate">{column.label}</h2>
              </span>
              <span className="min-w-9 rounded-[8px] bg-raised px-2 py-0.5 text-center font-mono text-xs text-ink tabular">{column.count}</span>
            </header>
            {column.items.length === 0 ? (
              <p className={cn("px-4 py-8 text-center text-[13px]", hovered ? "font-medium text-ink" : "text-muted")}>
                {target ? `Drop here to move to ${column.label}` : (COLUMN_EMPTY[column.key] ?? "Nothing here.")}
              </p>
            ) : (
              <ul className="max-h-[440px] space-y-2 overflow-y-auto p-3">
                {column.items.map((event) => (
                  <BoardCard
                    key={event.id}
                    event={event}
                    today={today}
                    dragged={dragging?.event.id === event.id}
                    onDragStart={() => setDragging({ event, from: column.key })}
                    onDragEnd={endDrag}
                    moves={columns.filter((other) => other.key !== column.key).map((other) => ({ key: other.key, label: other.label }))}
                    onMove={(to) => moveTo(event, column.key, to)}
                  />
                ))}
              </ul>
            )}
            {column.count > column.items.length && (
              <p className="border-t border-rule px-4 py-2 text-center font-mono text-[11px] text-faint">
                {column.items.length} of {column.count} shown
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function BoardCard({
  event,
  today,
  dragged,
  onDragStart,
  onDragEnd,
  moves,
  onMove,
}: {
  event: ScheduleEvent;
  today: string;
  dragged: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  moves: MoveOption[];
  onMove: (to: ScheduleColumnKey) => void;
}) {
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", event.title);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "relative cursor-grab rounded-[12px] border border-rule bg-ground/40 p-2.5 transition-[border-color,opacity] hover:border-control active:cursor-grabbing",
        dragged && "opacity-40",
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 size-3.5 shrink-0 text-faint" aria-hidden="true" />
        <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-raised text-faint">
          {event.cover_url ? (
            <img src={`${event.cover_url}?size=grid`} alt="" loading="lazy" draggable={false} className="size-full object-cover" />
          ) : (
            <Camera className="size-4" strokeWidth={1.5} aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          {/* The title's link stretches over the whole card; the menu sits above it. The link itself doesn't drag, so the card does. */}
          <Link
            href={`/projects/${event.id}`}
            draggable={false}
            className="block truncate text-[13px] font-semibold text-ink after:absolute after:inset-0 after:rounded-[12px]"
          >
            {event.title}
          </Link>
          <p className="truncate text-xs text-muted">{event.client?.name ?? "No client"}</p>
          <PaymentBadge percent={event.paid_percent} className="mt-1" />
        </div>
        <CardMenu event={event} moves={moves} onMove={onMove} />
      </div>
      <p className="mt-1 text-end font-mono text-[11px] text-faint tabular">{dayShort(event.date, today)}</p>
    </li>
  );
}

async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // The Clipboard API needs a secure context; fall back for plain-http hosts.
    const field = Object.assign(document.createElement("textarea"), { value: text });
    document.body.append(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  }
}

/**
 * The "…" menu: open, copy the client link, and "Move to" for touch screens
 * and keyboards, where dragging isn't available. It is fixed to the viewport
 * so a column's scroll box cannot clip it, and it closes on scroll, resize,
 * Escape or a click elsewhere.
 */
function CardMenu({ event, moves, onMove }: { event: ScheduleEvent; moves: MoveOption[]; onMove: (to: ScheduleColumnKey) => void }) {
  const [at, setAt] = useState<{ top: number; right: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (!at) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent) {
        if (e.key !== "Escape") return;
        button.current?.focus();
      } else if (e.type === "mousedown" && (menu.current?.contains(e.target as Node) || button.current?.contains(e.target as Node))) {
        return;
      }
      setAt(null);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [at]);

  const toggle = () => {
    if (at || !button.current) return setAt(null);
    const rect = button.current.getBoundingClientRect();
    setAt({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  };

  const shareUrl = event.share_url;
  const itemClass = "flex h-9 w-full items-center gap-2.5 rounded-control px-2.5 text-[13px] text-ink hover:bg-raised";

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={toggle}
        draggable={false}
        aria-haspopup="menu"
        aria-expanded={!!at}
        aria-label={`Actions for ${event.title}`}
        className="relative z-10 -me-1 -mt-1 flex size-7 shrink-0 items-center justify-center rounded-[8px] text-muted transition-colors hover:bg-raised hover:text-ink"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {at && (
        <div ref={menu} role="menu" className="fixed z-50 w-52 rounded-card border border-line bg-surface p-1.5 shadow-float" style={{ top: at.top, right: at.right }}>
          <Link role="menuitem" href={`/projects/${event.id}`} className={itemClass}>
            <ArrowUpRight className="size-4 text-muted" />
            Open project
          </Link>
          {shareUrl && (
            <button
              role="menuitem"
              type="button"
              onClick={async () => {
                setAt(null);
                await writeClipboard(shareUrl);
                toast("Client link copied");
              }}
              className={itemClass}
            >
              <Link2 className="size-4 text-muted" />
              Copy client link
            </button>
          )}
          <div className="mt-1.5 border-t border-rule pt-1.5">
            <p className="eyebrow px-2.5 pb-1 pt-0.5">Move to</p>
            {moves.map((option) => (
              <button
                key={option.key}
                role="menuitem"
                type="button"
                onClick={() => {
                  setAt(null);
                  onMove(option.key);
                }}
                className={itemClass}
              >
                <span className="size-2 shrink-0 rounded-full" style={{ background: STATUS_TONE[COLUMN_STATUS[option.key]].r }} aria-hidden="true" />
                <span className="flex-1 text-start">{option.label}</span>
                <ArrowRight className="size-3.5 text-faint" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function BoardSkeleton() {
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((column) => (
        <div key={column} className="rounded-card border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-rule px-4 py-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-9" />
          </div>
          <div className="space-y-2 p-3">
            {[0, 1, 2].map((card) => (
              <div key={card} className="flex gap-2 rounded-[12px] border border-rule p-2.5">
                <Skeleton className="size-12 rounded-[8px]" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="mt-1.5 h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
