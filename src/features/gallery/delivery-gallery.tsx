"use client";

import { useEffect, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Lock } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { useToast } from "@/components/ui/feedback";
import { FieldError, Input, Label } from "@/components/ui/field";
import { Meter } from "@/components/ui/meter";
import { Notice } from "@/components/ui/notice";
import { Skeleton, Spinner } from "@/components/ui/spinner";
import { api, ApiError, query } from "@/lib/api";
import { cn } from "@/lib/cn";
import { count, fileSize, number, plural, shortDate } from "@/lib/format";
import { SIZE_LABELS } from "@/lib/labels";
import type { DeliverySizeValue, GalleryDelivery, GalleryInfo } from "@/lib/types";
import { BottomBar, GalleryFooter, GalleryHeader } from "./gallery-chrome";
import { Lightbox } from "./lightbox";
import { ProgressTracker } from "./progress-tracker";
import { galleryKey, useOnLocked } from "./use-gallery";

const SIZES: { value: DeliverySizeValue; hint: string; description: string }[] = [
  { value: "original", hint: "Full size", description: "Full resolution, best for printing" },
  { value: "large", hint: "2048px", description: "Up to 2048px, great for screens" },
  { value: "web", hint: "1080px", description: "Up to 1080px, ideal for social media" },
];

/** The final delivery gallery, shown on the same link once the project is completed. */
export function DeliveryGallery({ token, gallery }: { token: string; gallery: GalleryInfo }) {
  const client = useQueryClient();
  const toast = useToast();
  const onLocked = useOnLocked(token);
  const [size, setSize] = useState<DeliverySizeValue>("original");
  const [followed, setFollowed] = useState<number | null>(null);
  const [index, setIndex] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);
  const [email, setEmail] = useState(gallery.client_email ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [requesting, setRequesting] = useState(false);
  const lastStatus = useRef<string | null>(null);

  const delivery = useQuery({
    queryKey: [...galleryKey(token), "delivery", size, followed],
    queryFn: () => api.get<GalleryDelivery>(`/gallery/${token}/delivery${query({ size, export: followed })}`),
    placeholderData: keepPreviousData,
    refetchInterval: (q) => (q.state.data?.export?.in_progress ? 2_000 : false),
  });

  const data = delivery.data;
  const exportItem = data?.export ?? null;

  useEffect(() => {
    if (delivery.error) onLocked(delivery.error);
  }, [delivery.error]);

  // Announce the moment a followed ZIP finishes.
  useEffect(() => {
    const status = exportItem?.status ?? null;
    if (lastStatus.current && lastStatus.current !== "ready" && status === "ready") {
      toast("Your ZIP is ready to download.");
      setSheet(false);
    }
    lastStatus.current = status;
  }, [exportItem?.status, toast]);

  async function requestZip(event: React.FormEvent) {
    event.preventDefault();
    setRequesting(true);
    setErrors({});
    try {
      const result = await api.post<{ export: { id: number } }>(`/gallery/${token}/delivery/zip`, { size, email });
      setFollowed(result.export.id);
      client.invalidateQueries({ queryKey: [...galleryKey(token), "delivery"] });
    } catch (error) {
      if (error instanceof ApiError && error.isValidation) {
        setErrors(Object.fromEntries(Object.entries(error.errors).map(([key, messages]) => [key, messages[0]])));
      } else {
        onLocked(error);
      }
    } finally {
      setRequesting(false);
    }
  }

  const sizeLabel = SIZE_LABELS[size];
  const selected = SIZES.find((option) => option.value === size)!;
  const finals = data?.finals ?? [];
  const total = data?.total_finals ?? 0;
  const canDownload = data?.can_download ?? gallery.can_download;
  const locked = data?.locked ?? gallery.is_delivery_locked;
  const current = index === null ? null : finals[index];

  return (
    <>
      <GalleryHeader brand={gallery.brand_name} title={gallery.title} />

      <main className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-6">
        <h1 className="text-[1.625rem] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-title">Your photos are ready</h1>
        <p className="mt-1.5 text-sm text-muted">
          {count(total, "edited photo")} from {gallery.brand_name}.
        </p>

        <ProgressTracker steps={data?.progress ?? gallery.progress} className="mt-5" />

        {locked ? (
          <Notice tone="locked" className="mt-5">
            <span className="font-semibold">Downloads unlock once payment is confirmed.</span> Previews are watermarked until then. Contact {gallery.brand_name} if
            you&rsquo;ve already paid.
          </Notice>
        ) : (
          !gallery.allow_download && (
            <Notice tone="neutral" className="mt-5">
              Downloads are turned off for this gallery. Contact {gallery.brand_name} for copies of your photos.
            </Notice>
          )
        )}

        {canDownload && finals.length > 0 && (
          <fieldset className="mt-6">
            <legend className="text-sm font-semibold text-ink">Download size</legend>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:max-w-xl">
              {SIZES.map((option) => {
                const active = option.value === size;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex min-h-16 cursor-pointer flex-col justify-center rounded-control border px-3 py-2 transition-colors",
                      active ? "border-ink bg-surface ring-1 ring-ink" : "border-line bg-surface hover:bg-raised",
                    )}
                  >
                    <input type="radio" name="size" value={option.value} checked={active} onChange={() => setSize(option.value)} className="sr-only" />
                    <span className="text-sm font-semibold text-ink">{SIZE_LABELS[option.value]}</span>
                    <span className="text-xs text-muted tabular">{option.hint}</span>
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted">{selected.description}</p>
          </fieldset>
        )}
      </main>

      <section className="mx-auto mt-5 max-w-[1240px] px-1 sm:px-6" aria-label="Final photos">
        {delivery.isPending ? (
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }, (_, item) => (
              <Skeleton key={item} className="aspect-square w-full rounded-none" />
            ))}
          </div>
        ) : finals.length === 0 ? (
          <div className="mx-3 rounded-card border border-line bg-surface px-6 py-14 text-center sm:mx-0">
            <p className="text-base font-semibold">Your photos are being prepared</p>
            <p className="mt-1 text-sm text-muted">Check back soon. {gallery.brand_name} is finishing the final touches.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-x-1 gap-y-2 sm:grid-cols-3 sm:gap-x-2 sm:gap-y-3 md:grid-cols-4 lg:grid-cols-5">
            {finals.map((photo, position) => (
              <li key={photo.id} className="min-w-0">
                <div className="relative aspect-square overflow-hidden bg-raised">
                  <button type="button" onClick={() => setIndex(position)} className="block size-full" aria-label={`View ${photo.filename}`}>
                    <img src={photo.grid_url} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
                  </button>
                  {photo.download_url && (
                    <a href={photo.download_url} download className="absolute bottom-1 end-1 flex size-11 items-center justify-center" aria-label={`Download ${photo.filename}`}>
                      <span className="flex size-8 items-center justify-center rounded-full bg-surface text-ink">
                        <Download className="size-4" />
                      </span>
                    </a>
                  )}
                </div>
                <p className="mt-1 truncate px-1 text-xs text-muted sm:px-0" title={photo.filename}>
                  {photo.filename}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <GalleryFooter />

      {canDownload && finals.length > 0 && (
        <BottomBar>
          {exportItem?.in_progress ? (
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">
                  Preparing your ZIP…{" "}
                  <span className="font-normal text-muted tabular">
                    {number(exportItem.processed)} / {number(exportItem.total)}
                  </span>
                </p>
                <Meter value={Math.max(exportItem.processed, exportItem.total * 0.03)} max={exportItem.total} className="mt-1.5" label="ZIP progress" />
                {exportItem.notify_email && (
                  <p className="mt-1 truncate text-xs text-muted">You can close this page. We&rsquo;ll email {exportItem.notify_email} when it&rsquo;s ready.</p>
                )}
              </div>
              <Spinner className="size-5 shrink-0 text-accent" />
            </div>
          ) : exportItem?.is_usable && data?.export_download_url ? (
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">Your ZIP is ready</p>
                <p className="text-xs text-muted tabular">
                  {count(exportItem.processed, "photo")} · {fileSize(exportItem.file_size)}
                  {exportItem.expires_at && ` · available until ${shortDate(exportItem.expires_at)}`}
                </p>
              </div>
              <a href={data.export_download_url} className={buttonClass("primary", "lg")}>
                <Download className="size-4" />
                Download ZIP
              </a>
            </div>
          ) : (
            <>
              {exportItem?.status === "failed" && exportItem.error && <p className="mb-2 text-sm text-negative">{exportItem.error}</p>}
              {sheet ? (
                <form onSubmit={requestZip} className="pb-1">
                  <Label htmlFor="zip-email">
                    Email me when it&rsquo;s ready <span className="font-normal text-muted">(optional)</span>
                  </Label>
                  <p className="text-xs text-muted">Large galleries can take a few minutes. You can close the page and use the link we send.</p>
                  <Input
                    id="zip-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@example.com"
                    className="mt-2 h-12 text-base"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    invalid={!!errors.email}
                  />
                  <FieldError message={errors.email ?? errors.zip ?? errors.size} />
                  <div className="mt-3 flex gap-2">
                    <Button size="lg" onClick={() => setSheet(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="lg" loading={requesting} className="flex-1">
                      Prepare {count(total, "photo")} ({sizeLabel})
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">
                      Download all {number(total)} {plural(total, "photo")}
                    </p>
                    <p className="text-xs text-muted">{sizeLabel} size · one ZIP file</p>
                  </div>
                  <Button variant="primary" size="lg" onClick={() => setSheet(true)}>
                    Download all
                  </Button>
                </div>
              )}
            </>
          )}
        </BottomBar>
      )}

      {current && index !== null && (
        <Lightbox
          label={current.filename}
          alt={current.filename}
          position={`${index + 1} / ${finals.length}`}
          src={current.full_url}
          onClose={() => setIndex(null)}
          onPrevious={index > 0 ? () => setIndex(index - 1) : undefined}
          onNext={index < finals.length - 1 ? () => setIndex(index + 1) : undefined}
          prefetch={[finals[index - 1]?.full_url ?? null, finals[index + 1]?.full_url ?? null]}
          footer={
            <div className="bg-surface px-4 py-3 safe-bottom">
              {canDownload && current.download_url ? (
                <a href={current.download_url} download className={buttonClass("primary", "lg", "mx-auto flex max-w-xl")}>
                  <Download className="size-5" />
                  Download ({sizeLabel})
                </a>
              ) : (
                <p className="mx-auto flex min-h-12 max-w-xl items-center justify-center gap-2 text-center text-sm text-muted">
                  {locked ? (
                    <>
                      <Lock className="size-4" /> Download unlocks after payment
                    </>
                  ) : (
                    "Downloads are turned off for this gallery"
                  )}
                </p>
              )}
            </div>
          }
        />
      )}
    </>
  );
}
