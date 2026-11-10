"use client";

import { use } from "react";
import { BookingDetailScreen } from "@/features/bookings/booking-detail";

export default function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <BookingDetailScreen id={id} />;
}
