"use client";

import { Suspense, use } from "react";
import { DeliveryGallery } from "@/features/gallery/delivery-gallery";
import { GalleryGate } from "@/features/gallery/gallery-gate";
import { ProofingGallery } from "@/features/gallery/proofing-gallery";

export default function GalleryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  return (
    <Suspense>
      <GalleryGate token={token}>
        {(gallery) =>
          gallery.is_delivery ? <DeliveryGallery token={token} gallery={gallery} /> : <ProofingGallery token={token} gallery={gallery} />
        }
      </GalleryGate>
    </Suspense>
  );
}
