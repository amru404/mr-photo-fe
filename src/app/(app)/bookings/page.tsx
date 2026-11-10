import { Suspense } from "react";
import { BookingsIndex } from "@/features/bookings/bookings-index";

export default function BookingsPage() {
  return (
    <Suspense>
      <BookingsIndex />
    </Suspense>
  );
}
