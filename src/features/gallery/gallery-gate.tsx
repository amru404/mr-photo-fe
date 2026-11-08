"use client";

import type { ReactNode } from "react";
import { Spinner } from "@/components/ui/spinner";
import type { GalleryInfo } from "@/lib/types";
import { useTitle } from "@/lib/use-title";
import { GalleryFooter, Unavailable } from "./gallery-chrome";
import { UnlockScreen } from "./unlock-screen";
import { deniedReason, useGallery } from "./use-gallery";

/**
 * Every client page goes through here: it opens the share link, shows the
 * password gate or the "unavailable" page, and otherwise renders the page.
 */
export function GalleryGate({ token, children, titlePrefix }: { token: string; titlePrefix?: string; children: (gallery: GalleryInfo) => ReactNode }) {
  const gallery = useGallery(token);
  const denied = deniedReason(gallery.error);
  const data = gallery.data;

  useTitle(denied ? denied.heading : data ? (titlePrefix ? `${titlePrefix} · ${data.title}` : data.title) : null);

  if (gallery.isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (gallery.isError) {
    return (
      <>
        {denied ? (
          <Unavailable heading={denied.heading} message={denied.message} brand={denied.brand_name} />
        ) : (
          <Unavailable heading="Something went wrong" message="We couldn't load this gallery. Please refresh the page in a moment." />
        )}
        <GalleryFooter />
      </>
    );
  }

  const open = gallery.data;

  if (!open.unlocked) {
    return (
      <>
        <UnlockScreen token={token} gallery={open} />
        <GalleryFooter />
      </>
    );
  }

  return <>{children(open)}</>;
}
