"use client";

import { FolderCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Pill } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/spinner";
import { count, number } from "@/lib/format";
import type { FolderPreview } from "@/lib/types";

/** Connecting a Google Drive folder: used by the wizard's Photos step and the project's Photos tab. */

export function ShareWithNotice({ email }: { email: string | null | undefined }) {
  return (
    <Notice tone="info">
      Share the folder with{" "}
      {email ? <span className="break-all font-semibold">{email}</span> : <span className="font-semibold">your service account email</span>} (Viewer access is
      enough).
    </Notice>
  );
}

export function FolderLinkField({
  value,
  onChange,
  onConnect,
  connecting,
  connected,
  error,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  onConnect: () => void;
  connecting: boolean;
  connected?: boolean;
  error?: string;
  autoFocus?: boolean;
}) {
  return (
    <Field label="Drive folder link" error={error}>
      {(id) => (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={id}
            autoFocus={autoFocus}
            placeholder="https://drive.google.com/drive/folders/…"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onConnect();
              }
            }}
            invalid={!!error}
          />
          <Button className="h-10" loading={connecting} onClick={onConnect}>
            {connecting ? "Connecting…" : connected ? "Refresh" : "Connect"}
          </Button>
        </div>
      )}
    </Field>
  );
}

export function FolderSkeleton() {
  return (
    <div className="mt-6">
      <Skeleton className="h-5 w-48" />
      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="aspect-square w-full" />
        ))}
      </div>
    </div>
  );
}

export function FolderResult({ folder }: { folder: FolderPreview }) {
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <FolderCheck className="size-4 text-positive" aria-hidden="true" />
          {folder.name}
        </p>
        <Pill tone="accent">{count(folder.photo_count, "photo found", "photos found")}</Pill>
      </div>

      {folder.photo_count === 0 ? (
        <Notice tone="warning" className="mt-4">
          This folder has no photos yet. You can still create the project; photos will appear once they&rsquo;re uploaded and the folder is re-synced.
        </Notice>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {folder.preview.map((photo) => (
              <figure key={photo.drive_file_id} className="min-w-0">
                <img src={photo.url} alt={photo.filename} loading="lazy" className="aspect-square w-full bg-raised object-cover" />
                <figcaption className="mt-1 truncate text-xs text-muted" title={photo.filename}>
                  {photo.filename}
                </figcaption>
              </figure>
            ))}
          </div>
          {folder.photo_count > folder.preview.length && (
            <p className="mt-3 text-sm text-muted">+ {number(folder.photo_count - folder.preview.length)} more will be imported.</p>
          )}
        </>
      )}
    </div>
  );
}
