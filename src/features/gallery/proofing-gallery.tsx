"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Heart, MessageSquare } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { useToast } from "@/components/ui/feedback";
import { FieldError, Textarea } from "@/components/ui/field";
import { Meter } from "@/components/ui/meter";
import { Notice } from "@/components/ui/notice";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/spinner";
import { api, ApiError, query } from "@/lib/api";
import { cn } from "@/lib/cn";
import { number, plural, relative } from "@/lib/format";
import type { GalleryInfo, GalleryPhoto, GalleryPhotoDetail, GalleryPhotoPage } from "@/lib/types";
import { useQueryState } from "@/lib/use-query-state";
import { BottomBar, GalleryFooter, GalleryHeader } from "./gallery-chrome";
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

      <div className="mx-auto max-w-[1240px] px-4 pt-5 sm:px-6">
        <ProgressTracker steps={gallery.progress} />

        <div className="mt-5">
          {locked ? (
            <Notice tone="success">
              {gallery.selection_submitted_at ? (
                <>
                  <span className="font-semibold">Selection sent.</span> Your picks are locked. Contact {gallery.brand_name} if you need changes.
                </>
              ) : (
                <>
                  <span className="font-semibold">Selection is closed.</span> You can still browse the photos.
                </>
              )}
            </Notice>
          ) : (
            <p className="text-[15px] leading-6 text-ink">
              Hi {gallery.client_name ?? "there"}! Tap <Heart className="inline size-4 -translate-y-px fill-accent text-accent" aria-label="the heart" /> on the
              photos you love{max ? ` (up to ${max})` : ""}, then review and send your selection.
            </p>
          )}
        </div>

        <Segmented<View>
          className="mt-5"
          size="lg"
          label="Photos"
          value={view}
          onChange={(value) => url.set({ view: value }, { defaults: { view: "all" } })}
          options={[
            { value: "all", label: "All photos", count: gallery.total_count },
            { value: "favorites", label: "My favorites", count: selectedCount },
          ]}
        />
      </div>

      <main className="mx-auto mt-4 max-w-[1240px] px-1 sm:px-6">
        {photos.isPending ? (
          <TileSkeleton />
        ) : tiles.length === 0 ? (
          <div className="mx-3 rounded-card border border-line bg-surface px-6 py-14 text-center sm:mx-0">
            {view === "favorites" ? (
              <>
                <p className="text-base font-semibold">No favorites yet</p>
                <p className="mt-1 text-sm text-muted">Tap the heart on any photo to add it here.</p>
                <Button variant="primary" size="lg" className="mt-5" onClick={() => url.set({ view: null })}>
                  Browse all photos
                </Button>
              </>
            ) : (
              <>
                <p className="text-base font-semibold">Photos are on their way</p>
                <p className="mt-1 text-sm text-muted">{gallery.brand_name} is still preparing this gallery. Check back soon.</p>
              </>
            )}
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-x-1 gap-y-2 sm:grid-cols-3 sm:gap-x-2 sm:gap-y-3 md:grid-cols-4 lg:grid-cols-5">
              {tiles.map((photo) => (
                <Tile key={photo.id} photo={photo} locked={locked} onOpen={() => setActiveId(photo.id)} onToggle={() => toggleFavorite(photo)} />
              ))}
            </ul>
            {photos.hasNextPage && (
              <div ref={sentinel} className="flex justify-center py-8">
                <Button size="lg" loading={photos.isFetchingNextPage} onClick={() => photos.fetchNextPage()}>
                  Load more photos
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <GalleryFooter />

      <BottomBar>
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink tabular">
              {number(selectedCount)} {plural(selectedCount, "photo")} selected
              {max && <span className="font-normal text-muted"> of {max}</span>}
            </p>
            {max ? (
              <Meter value={selectedCount} max={max} tone={atLimit ? "warning" : "accent"} className="mt-1.5" label="Photos selected" />
            ) : (
              !locked && <p className="text-xs text-muted">No limit, pick as many as you like</p>
            )}
          </div>
          {gallery.selection_submitted_at ? (
            <Link href={`/g/${token}/submitted`} className={buttonClass("secondary", "lg")}>
              View summary
            </Link>
          ) : (
            !locked && (
              <Link
                href={`/g/${token}/review`}
                aria-disabled={selectedCount === 0 || undefined}
                tabIndex={selectedCount === 0 ? -1 : undefined}
                className={buttonClass("primary", "lg", "gap-1.5")}
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

function Tile({ photo, locked, onOpen, onToggle }: { photo: GalleryPhoto; locked: boolean; onOpen: () => void; onToggle: () => void }) {
  return (
    <li className="min-w-0">
      <div className="relative aspect-square overflow-hidden bg-raised">
        <button type="button" onClick={onOpen} className="block size-full" aria-label={`Open ${photo.filename}`}>
          {photo.grid_url && (
            <img src={photo.grid_url} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
          )}
        </button>

        {photo.comments_count > 0 && (
          <span className="pointer-events-none absolute start-2 top-2 inline-flex items-center gap-1 rounded-chip bg-surface px-1.5 py-0.5 text-[11px] font-medium text-ink tabular">
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
            className="absolute bottom-1 end-1 flex size-11 items-center justify-center rounded-full transition-transform active:scale-90 disabled:cursor-default"
          >
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full transition-colors",
                photo.is_selected ? "bg-accent text-white dark:text-on-primary" : "bg-surface text-ink",
              )}
            >
              <Heart className={cn("size-4", photo.is_selected && "fill-current")} strokeWidth={2} />
            </span>
          </button>
        )}
      </div>
      <p className="mt-1 truncate px-1 text-xs text-muted sm:px-0" title={photo.filename}>
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
        <div className="rounded-t-[14px] bg-surface text-ink safe-bottom">
          <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
            {showFavorite && (
              <Button
                size="lg"
                variant={photo.is_selected ? "accent" : "secondary"}
                disabled={locked}
                aria-pressed={photo.is_selected}
                className="flex-1 transition-transform active:scale-[0.98]"
                icon={<Heart className={cn("size-5", photo.is_selected && "fill-current")} />}
                onClick={async () => {
                  await onToggle(photo);
                  client.invalidateQueries({ queryKey: detailKey });
                }}
              >
                {photo.is_selected ? "Favorited" : atLimit ? "Limit reached" : "Add to favorites"}
              </Button>
            )}
            {photo && (gallery.allow_comments || photo.comments.length > 0) && (
              <Button
                size="lg"
                aria-expanded={commentsOpen}
                icon={<MessageSquare className="size-5" />}
                onClick={() => setCommentsOpen((value) => !value)}
                className={cn(!showFavorite && "flex-1")}
              >
                {photo.comments.length || "Comment"}
              </Button>
            )}
          </div>

          {commentsOpen && photo && (
            <div className="mx-auto max-w-xl border-t border-line px-4 pb-4">
              {photo.comments.length > 0 && (
                <ul className="max-h-48 space-y-3 overflow-y-auto pt-4">
                  {photo.comments.map((comment) => (
                    <li key={comment.id}>
                      <p className="text-xs font-medium text-muted">
                        {comment.is_client ? "You" : gallery.brand_name} · {relative(comment.created_at)}
                      </p>
                      <p className="mt-0.5 whitespace-pre-line break-words text-sm text-ink">{comment.body}</p>
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
                    <Button type="submit" variant="primary" className="h-11" loading={sending}>
                      Send
                    </Button>
                  </div>
                  <FieldError message={error} />
                </form>
              ) : (
                photo.comments.length === 0 && <p className="pt-4 text-sm text-muted">No comments on this photo.</p>
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
    <div className="grid grid-cols-2 gap-x-1 gap-y-2 sm:grid-cols-3 sm:gap-x-2 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 10 }, (_, index) => (
        <div key={index}>
          <Skeleton className="aspect-square w-full rounded-none" />
          <Skeleton className="mt-1.5 h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

