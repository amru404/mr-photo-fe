"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, Heart, ImageIcon, Lock, MessageSquare } from "lucide-react";
import { useToast } from "@/components/ui/feedback";
import { FieldError, Textarea } from "@/components/ui/field";
import { Meter } from "@/components/ui/meter";
import { EmptyState } from "@/components/ui/notice";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/spinner";
import { api, ApiError, query } from "@/lib/api";
import { cn } from "@/lib/cn";
import { count, number, plural, relative } from "@/lib/format";
import type { GalleryInfo, GalleryPhoto, GalleryPhotoDetail, GalleryPhotoPage } from "@/lib/types";
import { useQueryState } from "@/lib/use-query-state";
import { ActionButton, actionClass, BottomBar, CountPill, GalleryFooter, GalleryHeader, Note, PAGE, Placeholder } from "./gallery-chrome";
import { Lightbox } from "./lightbox";
import { ProgressTracker } from "./progress-tracker";
import { galleryKey, useOnLocked } from "./use-gallery";

const PAGE_SIZE = 60;

type View = "all" | "favorites";

/** The proofing gallery: browse, heart, comment, then review and send. */
export function ProofingGallery({ token, gallery }: { token: string; gallery: GalleryInfo }) {
  const url = useQueryState();
  const client = useQueryClient();
  const toast = useToast();
  const onLocked = useOnLocked(token);
  const view: View = url.get("view") === "favorites" ? "favorites" : "all";
  const [activeId, setActiveId] = useState<number | null>(null);
  const empty = gallery.total_count === 0;

  const photosKey = [...galleryKey(token), "photos", view];
  const photos = useInfiniteQuery({
    queryKey: photosKey,
    queryFn: ({ pageParam }) => api.get<GalleryPhotoPage>(`/gallery/${token}/photos${query({ view: view === "all" ? null : view, offset: pageParam, limit: PAGE_SIZE })}`),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.has_more ? last.next_offset : undefined),
    // Poll while the gallery is still empty so photos and progress appear without a refresh.
    refetchInterval: empty ? 15_000 : false,
  });

  useEffect(() => {
    if (!empty) return;
    const timer = setInterval(() => client.invalidateQueries({ queryKey: galleryKey(token), exact: true }), 15_000);
    return () => clearInterval(timer);
  }, [empty, client, token]);

  useEffect(() => {
    if (photos.error) onLocked(photos.error);
  }, [photos.error]);

  const max = gallery.max_selectable_photos;
  const selectedCount = gallery.selected_count;
  const atLimit = max !== null && selectedCount >= max;
  const locked = gallery.is_selection_locked;

  const toggleFavorite = useCallback(
    async (photo: { id: number; is_selected: boolean }) => {
      // Flip it at once; the server's answer (or its refusal) settles it.
      const patch = (selected: boolean) =>
        client.setQueriesData<{ pages: GalleryPhotoPage[] }>({ queryKey: [...galleryKey(token), "photos"] }, (data) =>
          data && {
            ...data,
            pages: data.pages.map((page) => ({ ...page, data: page.data.map((item) => (item.id === photo.id ? { ...item, is_selected: selected } : item)) })),
          },
        );
      patch(!photo.is_selected);
      try {
        const result = await api.post<{ is_selected: boolean; selected_count: number }>(`/gallery/${token}/photos/${photo.id}/favorite`);
        patch(result.is_selected);
        client.setQueryData<GalleryInfo>(galleryKey(token), (data) => data && { ...data, selected_count: result.selected_count });
      } catch (error) {
        patch(photo.is_selected);
        if (error instanceof ApiError && error.field("selection")) toast(error.field("selection"), "error");
        else onLocked(error);
      } finally {
        client.invalidateQueries({ queryKey: galleryKey(token) });
      }
    },
    [client, token, toast, onLocked],
  );

  const tiles = photos.data?.pages.flatMap((page) => page.data) ?? [];
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !photos.hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !photos.isFetchingNextPage) photos.fetchNextPage();
      },
      { rootMargin: "600px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [photos.hasNextPage, photos.isFetchingNextPage, photos.fetchNextPage]);

  return (
    <>
      <GalleryHeader brand={gallery.brand_name} title={gallery.title} />

      <div className={cn(PAGE, "pt-5")}>
        <ProgressTracker steps={gallery.progress} />

        <div className="mt-4">
          {locked ? (
            gallery.selection_submitted_at ? (
              <Note tone="positive" icon={<Check strokeWidth={2.5} />}>
                <span className="font-semibold text-ink">Selection sent.</span> Your picks are locked. Contact {gallery.brand_name} if you need changes.
              </Note>
            ) : (
              <Note tone="neutral" icon={<Lock />}>
                <span className="font-semibold text-ink">Selection is closed.</span> You can still browse the photos.
              </Note>
            )
          ) : (
            <Note tone="accent">
              <span className="font-semibold text-ink">Hi {gallery.client_name ?? "there"}!</span> Tap{" "}
              <Heart className="inline size-3.5 -translate-y-px fill-love text-love" aria-label="the heart" /> on the photos you love
              {max ? (
                <>
                  {" "}
                  (up to <span className="font-mono text-ink">{number(max)}</span>)
                </>
              ) : (
                ""
              )}
              , then review and send your selection.
            </Note>
          )}
        </div>

        <Segmented<View>
          variant="chips"
          className="mt-4"
          label="Photos"
          value={view}
          onChange={(value) => url.set({ view: value }, { defaults: { view: "all" } })}
          options={[
            { value: "all", label: "All photos", count: gallery.total_count },
            { value: "favorites", label: "My favorites", count: selectedCount },
          ]}
        />
      </div>

      <main className={cn(PAGE, "mt-4")}>
        {photos.isPending ? (
          <TileSkeleton />
        ) : tiles.length === 0 ? (
          view === "favorites" ? (
            <EmptyState
              title="No favorites yet"
              action={
                <ActionButton onClick={() => url.set({ view: null })}>
                  Browse all photos
                </ActionButton>
              }
            >
              Tap the heart on any photo to add it here.
            </EmptyState>
          ) : (
            <EmptyState title="Photos are on their way">{gallery.brand_name} is still preparing this gallery. Check back soon.</EmptyState>
          )
        ) : (
          <>
            <ul className={GRID}>
              {tiles.map((photo) => (
                <Tile key={photo.id} photo={photo} locked={locked} onOpen={() => setActiveId(photo.id)} onToggle={() => toggleFavorite(photo)} />
              ))}
            </ul>
            {photos.hasNextPage && (
              <div ref={sentinel} className="flex justify-center py-8">
                <ActionButton variant="secondary" loading={photos.isFetchingNextPage} onClick={() => photos.fetchNextPage()}>
                  Load more photos
                </ActionButton>
              </div>
            )}
          </>
        )}
      </main>

      <GalleryFooter />

      <BottomBar>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <CountPill className={cn(atLimit && "text-status-selection")}>
                {number(selectedCount)}
                {max ? ` / ${number(max)}` : ""} <span className="sr-only">{plural(selectedCount, "photo")}</span> selected
              </CountPill>
              {!max && !locked && <span className="truncate text-xs text-muted">No limit, pick as many as you like</span>}
              {max && !locked && (
                <span className="hidden text-xs text-muted sm:inline">{atLimit ? "Limit reached" : `${count(max - selectedCount, "pick")} left`}</span>
              )}
            </div>
            {max ? <Meter value={selectedCount} max={max} tone={atLimit ? "warning" : "accent"} className="mt-2 max-w-xs" label="Photos selected" /> : null}
          </div>
          {gallery.selection_submitted_at ? (
            <Link href={`/g/${token}/submitted`} className={actionClass("secondary")}>
              View summary
            </Link>
          ) : (
            !locked && (
              <Link
                href={`/g/${token}/review`}
                aria-disabled={selectedCount === 0 || undefined}
                tabIndex={selectedCount === 0 ? -1 : undefined}
                className={actionClass("primary")}
              >
                Review
                <ChevronRight className="size-4" />
              </Link>
            )
          )}
        </div>
      </BottomBar>

      {activeId !== null && (
        <PhotoViewer
          token={token}
          gallery={gallery}
          view={view}
          photoId={activeId}
          atLimit={atLimit}
          onNavigate={setActiveId}
          onClose={() => setActiveId(null)}
          onToggle={toggleFavorite}
        />
      )}
    </>
  );
}

/** The photo grid of the project screen: framed cards, rounded frames, gap-3. */
const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";

function Tile({ photo, locked, onOpen, onToggle }: { photo: GalleryPhoto; locked: boolean; onOpen: () => void; onToggle: () => void }) {
  return (
    <li
      className={cn(
        "min-w-0 rounded-card border bg-surface p-1.5 transition-colors",
        photo.is_selected ? "border-accent" : "border-line hover:border-control",
      )}
    >
      <div className="relative aspect-square overflow-hidden rounded-[10px] bg-raised">
        <button type="button" onClick={onOpen} className="group block size-full" aria-label={`Open ${photo.filename}`}>
          {photo.grid_url ? (
            <img
              src={photo.grid_url}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-faint">
              <ImageIcon className="size-5" aria-hidden="true" />
            </span>
          )}
        </button>

        {photo.comments_count > 0 && (
          <span
            className="pointer-events-none absolute start-2 top-2 inline-flex items-center gap-1 rounded-chip bg-surface/90 px-1.5 py-0.5 font-mono text-[11px] text-ink shadow-sm tabular"
            title={count(photo.comments_count, "comment")}
          >
            <MessageSquare className="size-3" aria-hidden="true" />
            {photo.comments_count}
          </span>
        )}

        {!(locked && !photo.is_selected) && (
          <button
            type="button"
            onClick={onToggle}
            disabled={locked}
            aria-pressed={photo.is_selected}
            aria-label={photo.is_selected ? "Remove from favorites" : "Add to favorites"}
            className="group/heart absolute bottom-0 end-0 flex size-11 items-center justify-center rounded-full transition-transform active:scale-90 disabled:cursor-default"
          >
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full shadow-sm transition-colors",
                photo.is_selected ? "bg-love text-white" : "bg-surface/90 text-ink group-hover/heart:bg-surface",
              )}
            >
              <Heart className={cn("size-4", photo.is_selected && "fill-current")} strokeWidth={2} />
            </span>
          </button>
        )}
      </div>
      <p className="truncate px-1 pb-0.5 pt-1.5 font-mono text-[11px] text-muted" title={photo.filename}>
        {photo.filename}
      </p>
    </li>
  );
}

function PhotoViewer({
  token,
  gallery,
  view,
  photoId,
  atLimit,
  onNavigate,
  onClose,
  onToggle,
}: {
  token: string;
  gallery: GalleryInfo;
  view: View;
  photoId: number;
  atLimit: boolean;
  onNavigate: (id: number) => void;
  onClose: () => void;
  onToggle: (photo: { id: number; is_selected: boolean }) => Promise<void>;
}) {
  const client = useQueryClient();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);
  const locked = gallery.is_selection_locked;
  const detailKey = [...galleryKey(token), "photo", photoId, view];

  const detail = useQuery({
    queryKey: detailKey,
    queryFn: async () => (await api.get<{ photo: GalleryPhotoDetail }>(`/gallery/${token}/photos/${photoId}${query({ view: view === "all" ? null : view })}`)).photo,
    placeholderData: keepPreviousData,
  });

  const go = (id: number | null | undefined) => {
    if (!id) return;
    setBody("");
    setError(undefined);
    onNavigate(id);
  };

  async function sendComment(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setError(undefined);
    try {
      await api.post(`/gallery/${token}/photos/${photoId}/comments`, { body });
      setBody("");
      client.invalidateQueries({ queryKey: galleryKey(token) });
    } catch (reason) {
      setError(reason instanceof ApiError ? (reason.field("commentBody") ?? reason.message) : "Couldn't send your comment.");
    } finally {
      setSending(false);
    }
  }

  const photo = detail.data;
  const fullUrl = (id: number | null | undefined) => (id ? `/api/gallery/${token}/photos/${id}/image` : null);
  const showFavorite = photo && !(locked && !photo.is_selected);
  const canComment = gallery.allow_comments && !locked;

  return (
    <Lightbox
      label={photo?.filename ?? ""}
      alt={photo?.filename ?? "Photo"}
      position={photo ? `${photo.position} / ${photo.scoped_count}` : ""}
      src={photo?.full_url ?? null}
      loading={detail.isFetching && detail.isPlaceholderData}
      onClose={onClose}
      onPrevious={photo?.previous_id ? () => go(photo.previous_id) : undefined}
      onNext={photo?.next_id ? () => go(photo.next_id) : undefined}
      keysEnabled={!commentsOpen}
      onEscape={() => {
        if (!commentsOpen) return false;
        setCommentsOpen(false);
        return true;
      }}
      prefetch={[fullUrl(photo?.previous_id), fullUrl(photo?.next_id)]}
      footer={
        <div className="rounded-t-board border-t border-line bg-surface text-ink safe-bottom">
          <div className="mx-auto flex max-w-xl items-center gap-2.5 px-4 py-3">
            {showFavorite && (
              <ActionButton
                variant={photo.is_selected ? "love" : "secondary"}
                disabled={locked}
                aria-pressed={photo.is_selected}
                className="flex-1 active:scale-[0.98]"
                icon={<Heart className={cn("size-4", photo.is_selected && "fill-current")} />}
                onClick={async () => {
                  await onToggle(photo);
                  client.invalidateQueries({ queryKey: detailKey });
                }}
              >
                {photo.is_selected ? "Favorited" : atLimit ? "Limit reached" : "Add to favorites"}
              </ActionButton>
            )}
            {photo && (gallery.allow_comments || photo.comments.length > 0) && (
              <ActionButton
                variant="secondary"
                aria-expanded={commentsOpen}
                icon={<MessageSquare className="size-4" />}
                onClick={() => setCommentsOpen((value) => !value)}
                className={cn(!showFavorite && "flex-1")}
              >
                {photo.comments.length ? <span className="font-mono tracking-normal tabular">{photo.comments.length}</span> : "Comment"}
              </ActionButton>
            )}
          </div>

          {commentsOpen && photo && (
            <div className="mx-auto max-w-xl border-t border-rule px-4 pb-4">
              {photo.comments.length > 0 && (
                <ul className="max-h-48 space-y-3 overflow-y-auto pt-4">
                  {photo.comments.map((comment) => (
                    <li key={comment.id}>
                      <p className="flex items-baseline gap-1.5 text-xs font-semibold text-ink">
                        {comment.is_client ? "You" : gallery.brand_name}
                        <span className="font-mono text-[11px] font-normal text-faint">· {relative(comment.created_at)}</span>
                      </p>
                      <p className="mt-0.5 whitespace-pre-line break-words text-[13px] text-muted">{comment.body}</p>
                    </li>
                  ))}
                </ul>
              )}

              {canComment ? (
                <form onSubmit={sendComment} className="pt-4">
                  <label htmlFor="comment" className="sr-only">
                    Add a comment
                  </label>
                  <div className="flex items-end gap-2">
                    <Textarea
                      id="comment"
                      rows={2}
                      maxLength={gallery.comment_max_length}
                      placeholder="e.g. Please brighten this one"
                      className="text-base"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      invalid={!!error}
                    />
                    <ActionButton type="submit" loading={sending}>
                      Send
                    </ActionButton>
                  </div>
                  <FieldError message={error} />
                </form>
              ) : (
                photo.comments.length === 0 && <p className="pt-4 text-[13px] text-muted">No comments on this photo.</p>
              )}
            </div>
          )}
        </div>
      }
    />
  );
}

function TileSkeleton() {
  return (
    <div className={GRID}>
      {Array.from({ length: 10 }, (_, index) => (
        <div key={index} className="rounded-card border border-line bg-surface p-1.5">
          <Placeholder className="aspect-square w-full rounded-[10px]" />
          <Skeleton className="mx-1 mb-0.5 mt-2 h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}
