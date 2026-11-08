"use client";

import { use } from "react";
import { GalleryGate } from "@/features/gallery/gallery-gate";
import { SelectionSent } from "@/features/gallery/selection-sent";

export default function SubmittedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  return <GalleryGate token={token} titlePrefix="Selection sent">{(gallery) => <SelectionSent token={token} gallery={gallery} />}</GalleryGate>;
}
