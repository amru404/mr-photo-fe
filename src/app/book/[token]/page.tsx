"use client";

import { Suspense, use } from "react";
import { BookingPage } from "@/features/booking/booking-page";

export default function BookPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  return (
    <Suspense>
      <BookingPage token={token} />
    </Suspense>
  );
}
