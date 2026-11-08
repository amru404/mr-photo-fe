"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeftRight,
  Banknote,
  CircleCheck,
  Clock,
  Download,
  Eye,
  FolderCheck,
  Heart,
  Link2,
  Mail,
  MessageSquare,
  Plus,
} from "lucide-react";
import { Skeleton } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import { dateTime, plural, relative, time } from "@/lib/format";
import { SIZE_LABELS, STATUS_LABELS } from "@/lib/labels";
import type { DeliverySizeValue, FeedItem, ProjectStatusValue } from "@/lib/types";

export const CLIENT_EVENTS = ["gallery.opened", "photo.favorited", "comment.added", "selection.submitted", "delivery.zip_requested"];

const ICONS: Record<string, { icon: typeof Heart; accent?: boolean }> = {
  "gallery.opened": { icon: Eye },
  "photo.favorited": { icon: Heart, accent: true },
  "comment.added": { icon: MessageSquare },
  "selection.submitted": { icon: CircleCheck, accent: true },
  "delivery.zip_requested": { icon: Download },
  "project.created": { icon: Plus },
  "project.status_changed": { icon: ArrowLeftRight },
  "delivery.client_notified": { icon: Mail },
  "delivery.folder_connected": { icon: FolderCheck },
  "payment.confirmed": { icon: Banknote },
  "payment.unconfirmed": { icon: Banknote },
  "project.share_link_regenerated": { icon: Link2 },
};

export function describe(item: FeedItem): ReactNode {
  const client = <strong className="font-semibold">{item.client_name}</strong>;
  const meta = item.meta;
  const photoCount = Number(meta.photo_count ?? 0);

  switch (item.event) {
    case "gallery.opened":
      return (
        <>
          {client} opened the {meta.stage === "completed" ? "final gallery" : "gallery"}
          {item.count > 1 ? ` ${item.count} times` : ""}
        </>
      );
    case "photo.favorited":
      return item.count === 1 ? (
        <>
          {client} favorited <span className="font-mono text-[13px]">{String(meta.filename ?? "a photo")}</span>
        </>
      ) : (
        <>
          {client} favorited {item.count} photos
        </>
      );
    case "comment.added":
      return (
        <>
          {client} commented on <span className="font-mono text-[13px]">{String(meta.filename ?? "a photo")}</span>
        </>
      );
    case "selection.submitted":
      return (
        <>
          {client} submitted their selection of {photoCount} {plural(photoCount, "photo")}
        </>
      );
    case "delivery.zip_requested":
      return (
        <>
          {client} requested a ZIP ({SIZE_LABELS[meta.size as DeliverySizeValue] ?? "Original"} size)
        </>
      );
    case "project.created":
      return "You created the project";
    case "project.status_changed":
      return (
        <>
          Moved to <strong className="font-semibold">{STATUS_LABELS[meta.to as ProjectStatusValue] ?? "a new status"}</strong>
        </>
      );
    case "delivery.client_notified":
      return <>Emailed {client} that the finals are ready</>;
    case "delivery.folder_connected":
      return "You connected the delivery folder";
    case "payment.confirmed":
      return "You confirmed payment";
    case "payment.unconfirmed":
      return "You marked payment as not received";
    case "project.share_link_regenerated":
      return "You regenerated the gallery link";
    default:
      return item.event;
  }
}

function href(item: FeedItem) {
  return `/projects/${item.project.id}${item.tab ? `?tab=${item.tab}` : ""}`;
}

/** Full row: icon, sentence, project, comment excerpt and the photos it was about. */
export function FeedRow({ item }: { item: FeedItem }) {
  const { icon: Icon, accent } = ICONS[item.event] ?? { icon: Clock };
  const extra = item.event === "photo.favorited" ? item.count - item.photos.length : 0;

  return (
    <li className="relative">
      <Link href={href(item)} className="flex gap-4 px-5 py-4 transition-colors hover:bg-ground">
        <span
          className={cn(
            "relative z-10 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border bg-surface",
            accent ? "border-accent-track text-accent" : "border-line text-muted",
          )}
        >
          <Icon className="size-4" strokeWidth={1.75} fill={item.event === "photo.favorited" ? "currentColor" : "none"} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-ink">{describe(item)}</p>
            <time dateTime={item.at} title={dateTime(item.at)} className="shrink-0 pt-px font-mono text-xs text-muted">
              {time(item.at)}
            </time>
          </div>
          <p className="mt-0.5 truncate text-[13px] text-muted">{item.project.title}</p>

          {item.event === "comment.added" && typeof item.meta.excerpt === "string" && (
            <blockquote className="mt-2.5 border-s-2 border-accent-track ps-3 text-sm text-ink">{item.meta.excerpt}</blockquote>
          )}

          {item.photos.length > 0 && (
            <div className="mt-3 flex gap-1.5">
              {item.photos.map((photo) => (
                <img
                  key={photo.id}
                  src={`${photo.thumbnail_url}?size=grid`}
                  alt={photo.filename}
                  title={photo.filename}
                  loading="lazy"
                  className="size-14 bg-raised object-cover"
                />
              ))}
              {extra > 0 && (
                <span className="flex size-14 items-center justify-center bg-raised font-mono text-xs text-muted">+{extra}</span>
              )}
            </div>
          )}
        </div>
      </Link>
    </li>
  );
}

/** One line per event, for the overview rail. */
export function CompactFeedRow({ item }: { item: FeedItem }) {
  const { icon: Icon, accent } = ICONS[item.event] ?? { icon: Clock };
  return (
    <li>
      <Link href={href(item)} className="flex gap-3 px-4 py-3 transition-colors hover:bg-ground">
        <Icon
          className={cn("mt-0.5 size-4 shrink-0", accent ? "text-accent" : "text-faint")}
          strokeWidth={1.75}
          fill={item.event === "photo.favorited" ? "currentColor" : "none"}
        />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[13px] leading-5 text-ink">{describe(item)}</p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {item.project.title} · <time dateTime={item.at}>{relative(item.at)}</time>
          </p>
        </div>
      </Link>
    </li>
  );
}

export function FeedSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ul>
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex gap-3.5 border-t border-rule px-5 py-4 first:border-t-0">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="mt-2 h-3 w-1/3" />
          </div>
        </li>
      ))}
    </ul>
  );
}
