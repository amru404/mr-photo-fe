import type { ProjectStatusValue } from "@/lib/types";

/**
 * Each project status wears the colour of the Overview station it maps to
 * (see STUDIO_COLORS in features/overview/studio-scene.ts), so a project
 * reads the same on every screen. t = tint, r = mark, d = ink on the tint.
 */
export const STATUS_TONE: Record<ProjectStatusValue, { t: string; r: string; d: string }> = {
  draft: { t: "#CECBF6", r: "#7F77DD", d: "#3C3489" }, // Set up · purple
  selection: { t: "#B5D4F4", r: "#378ADD", d: "#0C447C" }, // Picking · blue
  editing: { t: "#F5C4B3", r: "#D85A30", d: "#712B13" }, // Editing · coral
  completed: { t: "#C0DD97", r: "#639922", d: "#27500A" }, // Done · green
  expired: { t: "#F7C1C1", r: "#E24B4A", d: "#791F1F" },
};
