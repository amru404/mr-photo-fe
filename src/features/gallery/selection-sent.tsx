"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { dateTime, number, plural } from "@/lib/format";
import type { GalleryInfo, GallerySubmitted } from "@/lib/types";
import { actionClass, Board, BOARD_TITLE, GalleryFooter, GalleryHeader, Placeholder } from "./gallery-chrome";
import { ProgressTracker } from "./progress-tracker";
import { galleryKey } from "./use-gallery";

/** Prints laid on the table at slight angles: the photos that were sent. */
const TILTS = [-6, 3, -2, 5];

export function SelectionSent({ token, gallery }: { token: string; gallery: GalleryInfo }) {
  const router = useRouter();
  const sent = useQuery({
    queryKey: [...galleryKey(token), "submitted"],
    queryFn: () => api.get<GallerySubmitted>(`/gallery/${token}/submitted`),
  });

  useEffect(() => {
    if (sent.data && !sent.data.submitted) router.replace(`/g/${token}/review`);
  }, [sent.data, router, token]);

  const data = sent.data;

  return (
    <>
      <GalleryHeader brand={gallery.brand_name} title={gallery.title} />

      <main className="mx-auto w-full max-w-[640px] px-4 pt-5 sm:px-6 lg:px-10">
        {!data || !data.submitted ? (
          <Placeholder className="h-64 w-full rounded-board" />
        ) : (
          <>
            <Board>
              <div className="px-5 pb-6 pt-7 text-center sm:px-8">
                <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-status-completed-soft text-status-completed">
                  <Check className="size-6" strokeWidth={2.5} aria-hidden="true" />
                </span>
                <p className="eyebrow mt-4">Selection</p>
                <h1 className={cn(BOARD_TITLE, "mt-1.5")}>Selection sent!</h1>
                <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-muted">
                  Thank you{gallery.client_name ? `, ${gallery.client_name}` : ""}. {gallery.brand_name} has received your {number(data.count)}{" "}
                  {plural(data.count, "photo")} and will start editing soon.
                </p>

                {data.preview.length > 0 && (
                  <div className="mx-auto mt-7 flex max-w-xs justify-center -space-x-4" aria-hidden="true">
                    {data.preview.map((photo, index) =>
                      photo.grid_url ? (
                        <img
                          key={photo.id}
                          src={photo.grid_url}
                          alt=""
                          className="size-20 rounded-[10px] border-4 border-surface bg-raised object-cover shadow-float"
                          style={{ transform: `rotate(${TILTS[index] ?? 0}deg)` }}
                        />
                      ) : null,
                    )}
                  </div>
                )}
              </div>

              <dl className={cn("grid divide-x divide-rule border-t border-rule bg-surface/80", data.submitted_at ? "grid-cols-2" : "grid-cols-1")}>
                <div className="px-5 py-3.5">
                  <dt className="eyebrow">Photos selected</dt>
                  <dd className="mt-1 font-mono text-section font-medium text-ink tabular">{number(data.count)}</dd>
                </div>
                {data.submitted_at && (
                  <div className="px-5 py-3.5">
                    <dt className="eyebrow">Sent on</dt>
                    <dd className="mt-1 font-mono text-[13px] leading-6 text-ink">{dateTime(data.submitted_at)}</dd>
                  </div>
                )}
              </dl>
            </Board>

            <ProgressTracker steps={data.progress} className="mt-4" />

            <Link href={`/g/${token}`} className={actionClass("secondary", "mt-4 w-full")}>
              Back to gallery
            </Link>
            <p className="mt-4 text-center text-xs text-muted">You can come back to this link any time to view your photos.</p>
          </>
        )}
      </main>

      <GalleryFooter />
    </>
  );
}
