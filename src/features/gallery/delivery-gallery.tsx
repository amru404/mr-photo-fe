"use client";

import { useEffect, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Lock } from "lucide-react";
import { useToast } from "@/components/ui/feedback";
import { FieldError, Input, Label } from "@/components/ui/field";
import { Meter } from "@/components/ui/meter";
import { EmptyState } from "@/components/ui/notice";
import { Skeleton, Spinner } from "@/components/ui/spinner";
import { api, ApiError, query } from "@/lib/api";
import { cn } from "@/lib/cn";
import { count, fileSize, number, plural, shortDate } from "@/lib/format";
import { SIZE_LABELS } from "@/lib/labels";
import type { DeliverySizeValue, GalleryDelivery, GalleryInfo } from "@/lib/types";
import { ActionButton, actionClass, Board, BOARD_TITLE, BottomBar, CountPill, GalleryFooter, GalleryHeader, Note, PAGE, Placeholder } from "./gallery-chrome";
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
  // Payment no longer gates downloads (only allow_download does); the legacy lock flag may be absent.
  const locked = data?.locked ?? gallery.is_delivery_locked ?? false;
  const current = index === null ? null : finals[index];

  return (
    <>
      <GalleryHeader brand={gallery.brand_name} title={gallery.title} />

      <main className={cn(PAGE, "pt-5")}>
        <Board>
          <div className="p-5">
            <p className="eyebrow">Delivery</p>
            <h1 className={cn(BOARD_TITLE, "mt-1.5")}>Your photos are ready</h1>
            <p className="mt-1 text-[13px] text-muted">
              {count(total, "edited photo")} from {gallery.brand_name}.
            </p>
          </div>
        </Board>

        <ProgressTracker steps={data?.progress ?? gallery.progress} className="mt-4" />

        {locked ? (
          <Note tone="warning" icon={<Lock />} className="mt-4">
            <span className="font-semibold text-ink">Downloads aren&rsquo;t available yet.</span> Contact {gallery.brand_name} if you need your photos now.
          </Note>
        ) : (
          !gallery.allow_download && (
            <Note tone="neutral" className="mt-4">
              Downloads are turned off for this gallery. Contact {gallery.brand_name} for copies of your photos.
            </Note>
          )
        )}

        {canDownload && finals.length > 0 && (
          <div className="mt-4 rounded-card border border-line bg-surface p-4 sm:p-5">
            <fieldset>
              <legend className="deck-title">Download size</legend>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:max-w-xl">
                {SIZES.map((option) => {
                  const active = option.value === size;
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "flex min-h-14 cursor-pointer flex-col justify-center rounded-[12px] border px-3 py-2 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                        active ? "border-ink bg-surface shadow-[0_0_0_1px_var(--ink)]" : "border-line bg-surface hover:bg-raised",
                      )}
                    >
                      <input type="radio" name="size" value={option.value} checked={active} onChange={() => setSize(option.value)} className="sr-only" />
                      <span className="text-[13px] font-semibold text-ink">{SIZE_LABELS[option.value]}</span>
                      <span className="mt-0.5 font-mono text-[11px] text-faint tabular">{option.hint}</span>
                    </label>
                  );
                })}
              </div>
              <p className="mt-2.5 text-[13px] text-muted">{selected.description}</p>
            </fieldset>
          </div>
        )}
      </main>

      <section className={cn(PAGE, "mt-4")} aria-label="Final photos">
        {delivery.isPending ? (
          <div className={GRID}>
            {Array.from({ length: 10 }, (_, item) => (
              <div key={item} className="rounded-card border border-line bg-surface p-1.5">
                <Placeholder className="aspect-square w-full rounded-[10px]" />
                <Skeleton className="mx-1 mb-0.5 mt-2 h-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : finals.length === 0 ? (
          <EmptyState title="Your photos are being prepared">Check back soon. {gallery.brand_name} is finishing the final touches.</EmptyState>
        ) : (
          <ul className={GRID}>
            {finals.map((photo, position) => (
              <li key={photo.id} className="min-w-0 rounded-card border border-line bg-surface p-1.5 transition-colors hover:border-control">
                <div className="relative aspect-square overflow-hidden rounded-[10px] bg-raised">
                  <button type="button" onClick={() => setIndex(position)} className="group block size-full" aria-label={`View ${photo.filename}`}>
                    <img
                      src={photo.grid_url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                  </button>
                  {photo.download_url && (
                    <a
                      href={photo.download_url}
                      download
                      className="group/download absolute bottom-0 end-0 flex size-11 items-center justify-center"
                      aria-label={`Download ${photo.filename}`}
                    >
                      <span className="flex size-8 items-center justify-center rounded-full bg-surface/90 text-ink shadow-sm transition-colors group-hover/download:bg-surface">
                        <Download className="size-4" />
                      </span>
                    </a>
                  )}
                </div>
                <p className="truncate px-1 pb-0.5 pt-1.5 font-mono text-[11px] text-muted" title={photo.filename}>
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
                <p className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-ink">
                  Preparing your ZIP…
                  <CountPill>
                    {number(exportItem.processed)} / {number(exportItem.total)}
                  </CountPill>
                </p>
                <Meter value={Math.max(exportItem.processed, exportItem.total * 0.03)} max={exportItem.total} className="mt-2" label="ZIP progress" />
                {exportItem.notify_email && (
                  <p className="mt-1.5 truncate text-xs text-muted">You can close this page. We&rsquo;ll email {exportItem.notify_email} when it&rsquo;s ready.</p>
                )}
              </div>
              <Spinner className="size-5 shrink-0 text-accent" />
            </div>
          ) : exportItem?.is_usable && data?.export_download_url ? (
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-ink">Your ZIP is ready</p>
                <p className="mt-0.5 truncate font-mono text-[11px] text-muted tabular">
                  {count(exportItem.processed, "photo")} · {fileSize(exportItem.file_size)}
                  {exportItem.expires_at && ` · available until ${shortDate(exportItem.expires_at)}`}
                </p>
              </div>
              <a href={data.export_download_url} className={actionClass("primary")}>
                <Download className="size-4" />
                Download ZIP
              </a>
            </div>
          ) : (
            <>
              {exportItem?.status === "failed" && exportItem.error && <p className="mb-2 text-[13px] text-negative">{exportItem.error}</p>}
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
                  <div className="mt-3 flex gap-2.5">
                    <ActionButton variant="secondary" onClick={() => setSheet(false)}>
                      Cancel
                    </ActionButton>
                    <ActionButton type="submit" loading={requesting} className="min-w-0 flex-1">
                      <span className="truncate">
                        Prepare {count(total, "photo")} ({sizeLabel})
                      </span>
                    </ActionButton>
                  </div>
                </form>
              ) : (
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-ink">
                      Download all
                      <CountPill>
                        {number(total)} {plural(total, "photo")}
                      </CountPill>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">{sizeLabel} size · one ZIP file</p>
                  </div>
                  <ActionButton onClick={() => setSheet(true)}>Download all</ActionButton>
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
            <div className="rounded-t-board border-t border-line bg-surface px-4 py-3 safe-bottom">
              {canDownload && current.download_url ? (
                <div className="mx-auto max-w-xl">
                  <a href={current.download_url} download className={actionClass("primary", "w-full")}>
                    <Download className="size-4" />
                    Download ({sizeLabel})
                  </a>
                </div>
              ) : (
                <p className="mx-auto flex min-h-[42px] max-w-xl items-center justify-center gap-2 text-center text-[13px] text-muted">
                  {locked ? (
                    <>
                      <Lock className="size-4" /> Downloads aren&rsquo;t available yet
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

/** The photo grid of the project screen: framed cards, rounded frames, gap-3. */
const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";
