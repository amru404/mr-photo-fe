"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { BrandInitial } from "@/components/brand";
import { FieldError, PasswordInput } from "@/components/ui/field";
import { api } from "@/lib/api";
import type { Gallery, GalleryLocked } from "@/lib/types";
import { useForm } from "@/lib/use-form";
import { ActionButton, GridBackdrop } from "./gallery-chrome";
import { galleryKey } from "./use-gallery";

/** The password / PIN gate of a protected gallery. */
export function UnlockScreen({ token, gallery }: { token: string; gallery: GalleryLocked }) {
  const client = useQueryClient();
  const form = useForm({ password: "" });
  const [busy, setBusy] = useState(false);

  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await api.post<{ gallery: Gallery }>(`/gallery/${token}/unlock`, form.values);
      client.setQueryData(galleryKey(token), result.gallery);
    } catch (error) {
      form.set("password", "");
      form.capture(error, "password");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-[85dvh] items-center justify-center px-4 pt-10 sm:px-6">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <BrandInitial name={gallery.brand_name} tone="ink" size="lg" className="mx-auto" />
          <p className="eyebrow mt-4">{gallery.brand_name}</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-[-0.02em] text-ink">{gallery.title}</h1>
        </div>

        <form onSubmit={unlock} className="relative mt-8 overflow-hidden rounded-board border border-line bg-surface" noValidate>
          <div className="relative border-b border-rule px-5 py-4">
            <GridBackdrop />
            <p className="deck-title relative flex items-center gap-2">
              <Lock className="size-3.5 text-accent" aria-hidden="true" />
              This gallery is protected
            </p>
            <p className="relative mt-1.5 text-[13px] text-muted">Enter the password or PIN your photographer gave you.</p>
          </div>

          <div className="p-5">
            <label htmlFor="gallery-password" className="sr-only">
              Password or PIN
            </label>
            <PasswordInput
              id="gallery-password"
              autoComplete="current-password"
              autoFocus
              placeholder="Password or PIN"
              className="h-12 text-base"
              value={form.values.password}
              onChange={(e) => form.set("password", e.target.value)}
              invalid={!!form.error("password")}
            />
            <FieldError message={form.error("password")} />

            <ActionButton type="submit" loading={busy} className="mt-4 w-full">
              View gallery
            </ActionButton>
          </div>
        </form>
      </div>
    </main>
  );
}
