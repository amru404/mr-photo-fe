import type { Status } from "@/lib/types";
import type { ScheduleEvent } from "./types";

/** A draft with no Drive folder yet is a booking: the app calls it "Booked". */
export function eventStatus(event: ScheduleEvent): Status {
  if (event.status.value === "draft" && !event.has_photos_folder) return { value: "draft", label: "Booked" };
  return event.status;
}
