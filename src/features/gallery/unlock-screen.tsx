"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { BrandInitial } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { FieldError, PasswordInput } from "@/components/ui/field";
import { api } from "@/lib/api";
import type { Gallery, GalleryLocked } from "@/lib/types";
import { useForm } from "@/lib/use-form";
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
    <main className="flex min-h-[85dvh] items-center justify-center px-4 pt-10">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <BrandInitial name={gallery.brand_name} className="mx-auto size-14 text-xl" />
          <p className="mt-4 text-sm text-muted">{gallery.brand_name}</p>
          <h1 className="mt-1 text-[1.625rem] font-bold leading-tight tracking-[-0.02em] text-ink">{gallery.title}</h1>
        </div>

        <form onSubmit={unlock} className="mt-8 rounded-card border border-line bg-surface p-6" noValidate>
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Lock className="size-4 text-accent" aria-hidden="true" />
            This gallery is protected
          </p>
          <p className="mt-1 text-sm text-muted">Enter the password or PIN your photographer gave you.</p>

          <label htmlFor="gallery-password" className="sr-only">
            Password or PIN
          </label>
          <PasswordInput
            id="gallery-password"
            autoComplete="current-password"
            autoFocus
            placeholder="Password or PIN"
            className="mt-5 h-12 text-base"
            value={form.values.password}
            onChange={(e) => form.set("password", e.target.value)}
            invalid={!!form.error("password")}
          />
          <FieldError message={form.error("password")} />

          <Button type="submit" variant="primary" size="lg" loading={busy} className="mt-5 w-full text-base">
            View gallery
          </Button>
        </form>
      </div>
    </main>
  );
}
