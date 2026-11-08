import type { DeliverySizeValue, ProjectStatusValue } from "./types";

/** Mirrors App\Enums\ProjectStatus::label(). */
export const STATUS_LABELS: Record<ProjectStatusValue, string> = {
  draft: "Draft",
  selection: "Awaiting Selection",
  editing: "Editing",
  completed: "Completed",
  expired: "Expired",
};

export const STATUS_ORDER: ProjectStatusValue[] = ["draft", "selection", "editing", "completed", "expired"];

/** Mirrors App\Enums\DeliverySize::label(). */
export const SIZE_LABELS: Record<DeliverySizeValue, string> = {
  original: "Original",
  large: "High",
  web: "Web",
};
