"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, X } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/feedback";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { count, number, plural } from "@/lib/format";
import type { GalleryInfo, GalleryReview, GallerySubmitted } from "@/lib/types";
import { BottomBar, GalleryFooter, GalleryHeader } from "./gallery-chrome";
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

      <main className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
        <h1 className="text-[1.625rem] font-bold leading-tight tracking-[-0.02em] text-ink">Review your selection</h1>
        <p className="mt-1.5 text-sm text-muted">
          Check your favorites before sending them to {gallery.brand_name}. Once sent, your selection is locked.
        </p>

        {review.isPending ? (
          <Skeleton className="mt-6 h-40 w-full" />
        ) : (
          <>
            <div className="mt-5 flex items-center justify-between rounded-card border border-line bg-surface px-4 py-3">
              <p className="text-sm text-muted">
                <span className="text-figure font-semibold text-ink tabular">{number(selected.length)}</span> {plural(selected.length, "photo")} selected
                {max && <span> of {max} allowed</span>}
              </p>
              {max && !data?.over_limit && <span className="text-xs font-medium text-muted tabular">{max - selected.length} left</span>}
            </div>

            {data?.over_limit && max && (
              <Notice tone="error" className="mt-4">
                You&rsquo;ve selected {selected.length} photos but the limit is {max}. Remove {count(selected.length - max, "photo")} to continue.
              </Notice>
            )}
            {error && (
              <Notice tone="error" className="mt-4">
                {error}
              </Notice>
            )}

            {selected.length === 0 ? (
              <div className="mt-6 rounded-card border border-line bg-surface px-6 py-14 text-center">
                <p className="text-base font-semibold">You haven&rsquo;t picked any photos yet</p>
                <p className="mt-1 text-sm text-muted">Go back and tap the heart on your favorites.</p>
                <Link href={back} className={buttonClass("primary", "lg", "mt-5")}>
                  Back to gallery
                </Link>
              </div>
            ) : (
              <ul className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {selected.map((photo) => (
                  <li key={photo.id} className="min-w-0">
                    <div className="relative aspect-square overflow-hidden bg-raised">
                      {photo.grid_url && (
                        <img src={photo.grid_url} alt={photo.filename} loading="lazy" className="size-full object-cover" />
                      )}
                      {photo.comments_count > 0 && (
                        <span className="absolute bottom-1.5 start-1.5 inline-flex items-center gap-1 rounded-chip bg-surface px-1.5 py-0.5 text-[11px] font-medium text-ink tabular">
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
                          className="absolute end-0 top-0 flex size-11 items-start justify-end p-1.5 disabled:opacity-60"
                        >
                          <span className="flex size-7 items-center justify-center rounded-full bg-surface text-ink">
                            <X className="size-4" strokeWidth={2.5} />
                          </span>
                        </button>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted" title={photo.filename}>
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
        <BottomBar>
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <Link href={back} className={buttonClass("secondary", "lg")}>
              Keep browsing
            </Link>
            <Button variant="primary" size="lg" className="flex-1" disabled={data?.over_limit} loading={busy === "submit"} onClick={() => submit(selected.length)}>
              Send selection
            </Button>
          </div>
        </BottomBar>
      )}
    </>
  );
}
