import { Suspense } from "react";
import { ScheduleScreen } from "@/features/schedule/schedule";

export default function SchedulePage() {
  return (
    <Suspense>
      <ScheduleScreen />
    </Suspense>
  );
}
