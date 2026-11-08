"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Expand, Heart, ImageIcon, MessageSquare, Minimize, Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { number } from "@/lib/format";
import type { Comment } from "@/lib/types";
import { CommentList } from "./comment-list";

export interface ViewerPhoto {
  id: number;
  filename: string;
  thumbnail_url: string | null;
  is_selected?: boolean;
  is_cover?: boolean;
  comments_count?: number;
}

const grid = (url: string) => `${url}${url.includes("?") ? "&" : "?"}size=grid`;

/** Pads a frame number like the edge of a contact sheet: 7 → 007. */
export function frame(n: number, total: number) {
  return String(n).padStart(Math.max(3, String(total).length), "0");
}

/**
 * The selected photo large in the middle, the previous one peeking in from
 * the left and the photo's details on the right; under it the count with
 * previous / next and a strip of large thumbnails. ← → move, F toggles
 * fullscreen, where only the photo itself is shown.
 */
export function PhotoViewer({
  photos,
  index,
  onIndex,
  offset = 0,
  total,
  canPrev = index > 0,
  canNext = index < photos.length - 1,
  onPrev,
  onNext,
  comments,
  aside,
}: {
  photos: ViewerPhoto[];
  index: number;
  onIndex: (index: number) => void;
  /** Position of photos[0] in the whole set (for numbers across pages). */
  offset?: number;
  total: number;
  canPrev?: boolean;
  canNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  comments?: Map<number, Comment[]>;
  aside?: ReactNode;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLOListElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [loaded, setLoaded] = useState<number | null>(null);
  const photo = photos[index];
  const previous = photos[index - 1];

  const prev = useCallback(() => (index > 0 ? onIndex(index - 1) : onPrev?.()), [index, onIndex, onPrev]);
  const next = useCallback(() => (index < photos.length - 1 ? onIndex(index + 1) : onNext?.()), [index, photos.length, onIndex, onNext]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    else stage.current?.requestFullscreen?.();
  }, []);

  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement === stage.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable=true], dialog")) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        prev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
      } else if (event.key === "f" || event.key === "F") {
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, toggleFullscreen]);

  // Keep the active thumbnail in view and warm the neighbours.
  useEffect(() => {
    strip.current?.querySelector<HTMLElement>("[aria-current=true]")?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    for (const neighbour of [photos[index - 1], photos[index + 1]]) {
      if (neighbour?.thumbnail_url) new Image().src = neighbour.thumbnail_url;
    }
  }, [index, photos]);

  if (!photo) return null;

  const position = offset + index + 1;
  const photoComments = comments?.get(photo.id) ?? [];
  const commentCount = photo.comments_count ?? photoComments.length;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[200px_minmax(0,1fr)_320px]">
        {/* The previous photo, peeking in from the left. */}
        <button
          type="button"
          onClick={prev}
          disabled={!canPrev}
          aria-label="Previous photo"
          className="group relative hidden overflow-hidden rounded-[16px] border border-line bg-surface disabled:opacity-40 2xl:block"
        >
          {previous?.thumbnail_url ? (
            <img src={grid(previous.thumbnail_url)} alt="" className="absolute inset-0 size-full object-cover opacity-50 transition-opacity group-hover:opacity-80" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-xs text-faint">{canPrev ? "Previous page" : "First photo"}</span>
          )}
          <span className="absolute bottom-3 start-3 flex size-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur">
            <ChevronLeft className="size-4" />
          </span>
        </button>

        {/* The stage: this element alone goes fullscreen. */}
        <div
          ref={stage}
          className={cn(
            "group relative flex items-center justify-center overflow-hidden bg-viewer",
            fullscreen ? "h-screen w-screen" : "h-[min(64dvh,720px)] min-h-[360px] rounded-[16px] ring-2 ring-accent",
          )}
        >
          {photo.thumbnail_url ? (
            <>
              <img
                key={`p-${photo.id}`}
                src={grid(photo.thumbnail_url)}
                alt=""
                aria-hidden="true"
                className={cn("absolute inset-0 m-auto max-h-full max-w-full object-contain blur-md", loaded === photo.id && "hidden")}
              />
              <img
                key={photo.id}
                src={photo.thumbnail_url}
                alt={photo.filename}
                onLoad={() => setLoaded(photo.id)}
                onDoubleClick={toggleFullscreen}
                className={cn("relative max-h-full max-w-full select-none object-contain", !fullscreen && "p-4")}
                draggable={false}
              />
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 text-viewer-muted">
              <ImageIcon className="size-8 animate-pulse" strokeWidth={1.25} />
              <span className="text-sm">Preview is still being cached</span>
            </div>
          )}

          <div className={cn("absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-3 text-viewer-ink transition-opacity", fullscreen && "opacity-0 group-hover:opacity-100")}>
            <span className="truncate rounded-[8px] bg-black/50 px-2.5 py-1 font-mono text-xs backdrop-blur">{fullscreen ? photo.filename : frame(position, total)}</span>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex h-8 items-center gap-1.5 rounded-[8px] bg-black/50 px-2.5 text-xs font-medium backdrop-blur transition-colors hover:bg-black/70"
              title={fullscreen ? "Exit fullscreen (F or Esc)" : "Fullscreen (F)"}
            >
              {fullscreen ? <Minimize className="size-3.5" /> : <Expand className="size-3.5" />}
              {fullscreen ? "Exit" : "Fullscreen"}
            </button>
          </div>

          {/* Arrows: always in fullscreen, on small screens where the side cards are hidden. */}
          <StageArrow side="left" disabled={!canPrev} onClick={prev} className={fullscreen ? "opacity-0 group-hover:opacity-100" : "2xl:hidden"} />
          <StageArrow side="right" disabled={!canNext} onClick={next} className={fullscreen ? "opacity-0 group-hover:opacity-100" : undefined} />
        </div>

        {/* The photo's details on the right. */}
        <aside className="flex min-w-0 flex-col gap-4 rounded-[16px] border border-line bg-surface p-5">
          <div className="text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-faint">Photo {frame(position, total)}</p>
            <h3 className="mt-1 break-all text-base font-semibold text-ink">{photo.filename}</h3>
          </div>

          <ul className="flex flex-wrap justify-center gap-1.5">
            {photo.is_selected ? (
              <Tag tone="accent">
                <Heart className="size-3" fill="currentColor" /> Client pick
              </Tag>
            ) : (
              <Tag>Not picked</Tag>
            )}
            {photo.is_cover && (
              <Tag>
                <Star className="size-3" /> Cover
              </Tag>
            )}
            {commentCount > 0 && (
              <Tag>
                <MessageSquare className="size-3" /> {number(commentCount)}
              </Tag>
            )}
          </ul>

          <div className="min-h-0 flex-1 overflow-y-auto border-t border-rule pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Comments</p>
            {photoComments.length > 0 ? <CommentList comments={photoComments} /> : <p className="mt-2 text-sm text-faint">No comments on this photo.</p>}
          </div>

          {aside}

          <button
            type="button"
            onClick={next}
            disabled={!canNext}
            className="hidden h-10 items-center justify-center gap-1.5 rounded-[10px] bg-raised text-sm font-medium text-ink hover:bg-active disabled:opacity-40 lg:flex"
          >
            Next photo <ChevronRight className="size-4" />
          </button>
        </aside>
      </div>

      {/* Count and paging */}
      <div className="flex items-center justify-between gap-4 px-1">
        <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted">
          <span className="text-ink">{number(position)}</span> of {number(total)} photos
          <span className="ms-3 hidden normal-case tracking-normal text-faint xl:inline">← → to move · F fullscreen · double-click the photo</span>
        </p>
        <div className="flex gap-1.5">
          <SquareButton label="Previous photo" disabled={!canPrev} onClick={prev}>
            <ChevronLeft className="size-4" />
          </SquareButton>
          <SquareButton label="Next photo" disabled={!canNext} onClick={next}>
            <ChevronRight className="size-4" />
          </SquareButton>
        </div>
      </div>

      {/* Large thumbnails */}
      <ol
        ref={strip}
        className="flex gap-3 overflow-x-auto pb-3 [scrollbar-color:var(--control)_transparent] [scrollbar-width:thin]"
        aria-label="Photos on this page"
      >
        {photos.map((item, itemIndex) => {
          const active = itemIndex === index;
          return (
            <li key={item.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onIndex(itemIndex)}
                aria-current={active}
                aria-label={item.filename}
                className={cn(
                  "relative block h-44 w-36 overflow-hidden rounded-[14px] border bg-surface transition sm:h-48 sm:w-40",
                  active ? "border-accent ring-2 ring-accent" : "border-line opacity-70 hover:opacity-100",
                )}
              >
                {item.thumbnail_url ? (
                  <img src={grid(item.thumbnail_url)} alt="" loading="lazy" className="size-full object-cover" />
                ) : (
                  <span className="block size-full bg-raised" />
                )}
                <span className="absolute inset-x-2 top-2 flex items-start justify-between gap-1">
                  <span className="truncate rounded-[6px] bg-black/55 px-1.5 py-0.5 text-[10px] text-white backdrop-blur">{item.filename}</span>
                  {item.is_selected && (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent">
                      <Heart className="size-2.5 text-white" fill="currentColor" />
                    </span>
                  )}
                </span>
                <span className="absolute bottom-2 start-2 rounded-[6px] bg-black/55 px-1.5 font-mono text-[10px] text-white backdrop-blur">
                  {frame(offset + itemIndex + 1, total)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StageArrow({ side, disabled, onClick, className }: { side: "left" | "right"; disabled: boolean; onClick: () => void; className?: string }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      className={cn(
        "absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-viewer-ink backdrop-blur transition hover:bg-black/75 disabled:pointer-events-none disabled:opacity-0",
        side === "left" ? "start-3" : "end-3",
        className,
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}

function SquareButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded-[10px] border border-line bg-surface text-ink transition-colors hover:bg-raised disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Tag({ children, tone }: { children: ReactNode; tone?: "accent" }) {
  return (
    <li className={cn("inline-flex h-6 items-center gap-1 rounded-[6px] px-2 text-xs font-medium", tone === "accent" ? "bg-accent-soft text-accent-ink" : "bg-raised text-muted")}>
      {children}
    </li>
  );
}
