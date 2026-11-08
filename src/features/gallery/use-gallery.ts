"use client";

import { useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { Gallery, GalleryDenied, GalleryInfo } from "@/lib/types";

export const galleryKey = (token: string) => ["gallery", token] as const;

/**
 * The gallery as this browser session may see it. On the first load of a
 * share link, its signature is posted to open the gallery (which grants the
 * session), and then dropped from the address bar.
 */
export function useGallery(token: string) {
  const signature = useRef<string | null>(
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("signature"),
  );

  return useQuery({
    queryKey: galleryKey(token),
    queryFn: async () => {
      const pending = signature.current;
      if (pending) {
        signature.current = null;
        const result = await api.post<{ gallery: Gallery }>(`/gallery/${token}/open`, { signature: pending });
        window.history.replaceState(null, "", window.location.pathname);
        return result.gallery;
      }
      return (await api.get<{ gallery: Gallery }>(`/gallery/${token}`)).gallery;
    },
    staleTime: 15_000,
  });
}

/** Why the gallery can't be shown, when the API refused it. */
export function deniedReason(error: unknown): GalleryDenied | null {
  if (error instanceof ApiError && typeof error.body.reason === "string") return error.body as unknown as GalleryDenied;
  return null;
}

/** Refreshes counts, progress and every photo list of a gallery. */
export function useRefreshGallery(token: string) {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: galleryKey(token) });
}

/**
 * Inner gallery requests answer 423 when the password changed under an open
 * session; reloading the gallery then shows the password gate again.
 */
export function useOnLocked(token: string) {
  const refresh = useRefreshGallery(token);
  return (error: unknown) => {
    if (error instanceof ApiError && (error.status === 423 || error.status === 403 || error.status === 410)) refresh();
  };
}

export function isOpen(gallery: Gallery | undefined): gallery is GalleryInfo {
  return !!gallery && gallery.unlocked;
}
