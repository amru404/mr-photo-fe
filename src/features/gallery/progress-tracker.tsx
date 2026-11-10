import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { longDate, shortDate } from "@/lib/format";
import type { ProgressStep } from "@/lib/types";
import { STUDIO_COLORS } from "@/features/overview/studio-scene";
import { CountPill, GridBackdrop } from "./gallery-chrome";

/** The Overview's five station colours, in workflow order (Set up → Done). */
const STATION_COLORS = [STUDIO_COLORS.purple, STUDIO_COLORS.blue, STUDIO_COLORS.teal, STUDIO_COLORS.coral, STUDIO_COLORS.green];

/** Spread the steps over the stations so the first is Set up and the last is Done (4 steps: purple, blue, coral, green). */
function colorOf(index: number, total: number) {
  const station = total <= 1 ? STATION_COLORS.length - 1 : Math.round((index * (STATION_COLORS.length - 1)) / (total - 1));
  return STATION_COLORS[station];
}

/** Where the client's project stands, from "photos uploaded" to delivery: the project board's station track. */
export function ProgressTracker({ steps, className }: { steps: ProgressStep[]; className?: string }) {
  if (steps.length === 0) return null;

  const doneCount = steps.filter((step) => step.state === "done").length;
  const current = steps.find((step) => step.state === "current") ?? steps[steps.length - 1];
  const position = steps.indexOf(current) + 1;
  const isCurrent = current.state === "current";
  const allDone = doneCount === steps.length;
  const currentColor = colorOf(position - 1, steps.length);

  return (
    <section aria-label="Project progress" className={cn("relative overflow-hidden rounded-board border border-line bg-surface", className)}>
      <GridBackdrop />

      <div className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">Progress</p>
            <h2 className="mt-1 text-sm font-semibold text-ink">Project progress</h2>
          </div>
          <CountPill>
            {allDone && <Check className="size-3 text-positive" strokeWidth={3} aria-hidden="true" />}
            <span aria-hidden="true">
              {allDone ? steps.length : position} / {steps.length}
            </span>
            <span className="sr-only">{allDone ? "All done" : `Step ${position} of ${steps.length}`}</span>
          </CountPill>
        </div>

        <ol className="mt-4 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
          {steps.map((step, index) => {
            const done = step.state === "done";
            const now = step.state === "current";
            const color = colorOf(index, steps.length);
            return (
              <li key={step.title} aria-current={now ? "step" : undefined} className="min-w-0">
                <span aria-hidden="true" className="block h-1.5 rounded-full" style={{ background: done || now ? color.r : "var(--active)" }} />
                <span className={cn("mt-2 flex items-start gap-1.5 text-[11px] leading-tight", now ? "font-semibold text-ink" : done ? "text-muted" : "text-faint")}>
                  {now && <span aria-hidden="true" className="mt-[3px] size-1.5 shrink-0 rounded-full" style={{ background: color.r }} />}
                  <span className="min-w-0">
                    {done && <span className="sr-only">Done: </span>}
                    {step.title}
                  </span>
                </span>
                {step.at ? (
                  <span className="mt-0.5 hidden font-mono text-[10px] text-faint tabular sm:block">{shortDate(step.at)}</span>
                ) : step.due ? (
                  <span className="mt-0.5 hidden font-mono text-[10px] text-faint tabular sm:block">by {shortDate(step.due)}</span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>

      {/* The one line that matters: what is happening now. */}
      <div className="relative flex items-start gap-2.5 border-t border-rule bg-surface/80 px-5 py-3 text-[13px] leading-5">
        {isCurrent ? (
          <span className="relative mt-1.5 flex size-2 shrink-0" aria-hidden="true">
            <span className="absolute inline-flex size-full animate-ping rounded-full opacity-60 motion-reduce:hidden" style={{ background: currentColor.r }} />
            <span className="relative inline-flex size-2 rounded-full" style={{ background: currentColor.r }} />
          </span>
        ) : (
          <Check className="mt-0.5 size-4 shrink-0 text-positive" strokeWidth={2.5} aria-hidden="true" />
        )}
        <p className="min-w-0 text-muted">
          <span className="font-semibold text-ink">
            {isCurrent ? "Now: " : ""}
            {current.title}.
          </span>{" "}
          {current.description}
          {current.at ? (
            <span className="font-mono text-[12px] text-faint"> · {longDate(current.at)}</span>
          ) : isCurrent && current.due ? (
            <span className="font-mono text-[12px] text-faint"> · Expected by {longDate(current.due)}</span>
          ) : null}
        </p>
      </div>
    </section>
  );
}
