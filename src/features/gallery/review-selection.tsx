"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, MessageSquare, X } from "lucide-react";
import { useConfirm } from "@/components/ui/feedback";
import { EmptyState } from "@/components/ui/notice";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { count, number, plural } from "@/lib/format";
import type { GalleryInfo, GalleryReview, GallerySubmitted } from "@/lib/types";
import { ActionButton, actionClass, Board, BOARD_TITLE, BottomBar, CountPill, GalleryFooter, GalleryHeader, Note, PAGE_NARROW, Placeholder } from "./gallery-chrome";
import { galleryKey, useOnLocked } from "./use-gallery";

export function ReviewSelection({ token, gallery }: { token: string; gallery: GalleryInfo }) {
  const router = useRouter();
  const client = useQueryClient();
  const confirm = useConfirm();
  const onLocked = useOnLocked(token);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<number | "submit" | null>(null);
  const key = [...galleryKey(token), "review"];
  const back = `/g/${token}`;

  const review = useQuery({ queryKey: key, queryFn: () => api.get<GalleryReview>(`/gallery/${token}/review`) });

  // A sent selection has its own page.
  useEffect(() => {
    if (review.data?.submitted || gallery.selection_submitted_at) router.replace(`/g/${token}/submitted`);
  }, [review.data?.submitted, gallery.selection_submitted_at, router, token]);

  async function remove(photoId: number) {
    setBusy(photoId);
    setError(undefined);
    try {
      client.setQueryData(key, await api.delete<GalleryReview>(`/gallery/${token}/review/${photoId}`));
      client.invalidateQueries({ queryKey: galleryKey(token) });
    } catch (reason) {
      setError(reason instanceof ApiError ? (reason.field("selection") ?? reason.message) : undefined);
      onLocked(reason);
    } finally {
      setBusy(null);
    }
  }

  async function submit(selectedCount: number) {
    const ok = await confirm({
      title: `Send ${count(selectedCount, "photo")}?`,
      message: `Send ${count(selectedCount, "photo")} to ${gallery.brand_name}? You won't be able to change your selection afterwards.`,
      confirmLabel: "Send selection",
    });
    if (!ok) return;
    setBusy("submit");
    setError(undefined);
    try {
      const result = await api.post<GallerySubmitted>(`/gallery/${token}/submit`);
      client.setQueryData([...galleryKey(token), "submitted"], result);
      await client.invalidateQueries({ queryKey: galleryKey(token) });
      router.replace(`/g/${token}/submitted`);
    } catch (reason) {
      setError(reason instanceof ApiError ? (reason.field("selection") ?? reason.message) : "Something went wrong.");
      onLocked(reason);
      setBusy(null);
    }
  }

  const data = review.data;
  const selected = data?.selected ?? [];
  const max = data?.max ?? null;

  return (
    <>
      <GalleryHeader brand={gallery.brand_name} title={gallery.title} back={back} />

      <main className={cn(PAGE_NARROW, "pt-5")}>
        <Board>
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="eyebrow">Review</p>
              <h1 className={cn(BOARD_TITLE, "mt-1.5")}>Review your selection</h1>
              <p className="mt-1 max-w-xl text-[13px] text-muted">
                Check your favorites before sending them to {gallery.brand_name}. Once sent, your selection is locked.
              </p>
            </div>
            {!review.isPending && (
              <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
                <p className="flex items-baseline gap-2 text-[13px] text-muted">
                  <span className="font-mono text-figure font-medium text-ink tabular">{number(selected.length)}</span>
                  <span>
                    {plural(selected.length, "photo")} selected
                    {max && <span> of {max} allowed</span>}
                  </span>
                </p>
                {max && !data?.over_limit && <CountPill>{max - selected.length} left</CountPill>}
              </div>
            )}
          </div>
        </Board>

        {review.isPending ? (
          <Placeholder className="mt-4 h-40 w-full rounded-card" />
        ) : (
          <>
            {data?.over_limit && max && (
              <Note tone="negative" icon={<CircleAlert />} className="mt-4">
                You&rsquo;ve selected <span className="font-mono text-ink">{selected.length}</span> photos but the limit is{" "}
                <span className="font-mono text-ink">{max}</span>. Remove {count(selected.length - max, "photo")} to continue.
              </Note>
            )}
            {error && (
              <Note tone="negative" icon={<CircleAlert />} className="mt-4">
                {error}
              </Note>
            )}

            {selected.length === 0 ? (
              <EmptyState
                className="mt-4"
                title="You haven’t picked any photos yet"
                action={
                  <Link href={back} className={actionClass("primary")}>
                    Back to gallery
                  </Link>
                }
              >
                Go back and tap the heart on your favorites.
              </EmptyState>
            ) : (
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {selected.map((photo) => (
                  <li key={photo.id} className="min-w-0 rounded-card border border-line bg-surface p-1.5">
                    <div className="relative aspect-square overflow-hidden rounded-[10px] bg-raised">
                      {photo.grid_url && <img src={photo.grid_url} alt={photo.filename} loading="lazy" className="size-full object-cover" />}
                      {photo.comments_count > 0 && (
                        <span className="absolute bottom-2 start-2 inline-flex items-center gap-1 rounded-chip bg-surface/90 px-1.5 py-0.5 font-mono text-[11px] text-ink shadow-sm tabular">
                          <MessageSquare className="size-3" aria-hidden="true" />
                          {photo.comments_count}
                        </span>
                      )}
                      {!data?.locked && (
                        <button
                          type="button"
                          onClick={() => remove(photo.id)}
                          disabled={busy !== null}
                          aria-label={`Remove ${photo.filename}`}
                          className="group/remove absolute end-0 top-0 flex size-11 items-start justify-end p-1.5 disabled:opacity-60"
                        >
                          <span className="flex size-7 items-center justify-center rounded-full bg-surface/90 text-ink shadow-sm transition-colors group-hover/remove:bg-surface group-hover/remove:text-negative">
                            <X className="size-4" strokeWidth={2.5} />
                          </span>
                        </button>
                      )}
                    </div>
                    <p className="truncate px-1 pb-0.5 pt-1.5 font-mono text-[11px] text-muted" title={photo.filename}>
                      {photo.filename}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>

      <GalleryFooter />

      {selected.length > 0 && !data?.locked && (
        <BottomBar narrow>
          <div className="flex items-center gap-2.5">
            <Link href={back} className={actionClass("secondary")}>
              Keep browsing
            </Link>
            <ActionButton className="min-w-0 flex-1" disabled={data?.over_limit} loading={busy === "submit"} onClick={() => submit(selected.length)}>
              Send selection
            </ActionButton>
          </div>
        </BottomBar>
      )}
    </>
  );
}
