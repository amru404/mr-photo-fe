"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { dateTime, number, plural } from "@/lib/format";
import type { GalleryInfo, GallerySubmitted } from "@/lib/types";
import { GalleryFooter, GalleryHeader } from "./gallery-chrome";
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

      <main className="mx-auto max-w-md px-4 pt-10 sm:px-6">
        {!data || !data.submitted ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            <div className="text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-status-completed-soft text-status-completed">
                <Check className="size-7" strokeWidth={2.5} aria-hidden="true" />
              </span>
              <h1 className="mt-5 text-[1.625rem] font-bold leading-tight tracking-[-0.02em] text-ink">Selection sent!</h1>
              <p className="mt-2 text-sm text-muted">
                Thank you{gallery.client_name ? `, ${gallery.client_name}` : ""}. {gallery.brand_name} has received your {number(data.count)}{" "}
                {plural(data.count, "photo")} and will start editing soon.
              </p>
            </div>

            {data.preview.length > 0 && (
              <div className="mx-auto mt-9 flex max-w-xs justify-center -space-x-4" aria-hidden="true">
                {data.preview.map((photo, index) =>
                  photo.grid_url ? (
                    <img
                      key={photo.id}
                      src={photo.grid_url}
                      alt=""
                      className="size-20 border-4 border-surface object-cover shadow-float"
                      style={{ transform: `rotate(${TILTS[index] ?? 0}deg)` }}
                    />
                  ) : null,
                )}
              </div>
            )}

            <dl className="mt-9 divide-y divide-rule rounded-card border border-line bg-surface text-sm">
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-muted">Photos selected</dt>
                <dd className="font-semibold text-ink tabular">{number(data.count)}</dd>
              </div>
              {data.submitted_at && (
                <div className="flex justify-between gap-4 px-4 py-3">
                  <dt className="text-muted">Sent on</dt>
                  <dd className="font-semibold text-ink">{dateTime(data.submitted_at)}</dd>
                </div>
              )}
            </dl>

            <ProgressTracker steps={data.progress} className="mt-6" />

            <Link href={`/g/${token}`} className={buttonClass("secondary", "lg", "mt-6 w-full")}>
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
