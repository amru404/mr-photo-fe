"use client";

import { use } from "react";
import { GalleryGate } from "@/features/gallery/gallery-gate";
import { ReviewSelection } from "@/features/gallery/review-selection";

export default function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  return <GalleryGate token={token} titlePrefix="Review selection">{(gallery) => <ReviewSelection token={token} gallery={gallery} />}</GalleryGate>;
}
