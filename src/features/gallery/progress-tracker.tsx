import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { longDate, shortDate } from "@/lib/format";
import type { ProgressStep } from "@/lib/types";

/** Where the client's project stands, from "photos uploaded" to delivery. */
export function ProgressTracker({ steps, className }: { steps: ProgressStep[]; className?: string }) {
  if (steps.length === 0) return null;

  const doneCount = steps.filter((step) => step.state === "done").length;
  const current = steps.find((step) => step.state === "current") ?? steps[steps.length - 1];
  const position = steps.indexOf(current) + 1;
  const isCurrent = current.state === "current";

  return (
    <section aria-label="Project progress" className={cn("rounded-card border border-line bg-surface px-4 py-4 sm:px-5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">Project progress</h2>
        <p className="text-xs text-muted tabular">{doneCount === steps.length ? "All done" : `${position} of ${steps.length}`}</p>
      </div>

      <ol className="mt-4 flex items-start">
        {steps.map((step, index) => {
          const done = step.state === "done";
          const now = step.state === "current";
          return (
            <li key={step.title} aria-current={now ? "step" : undefined} className="relative flex flex-1 flex-col items-center text-center">
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={cn("absolute end-1/2 top-3 h-px w-full", done || now ? "bg-positive" : "bg-line")}
                />
              )}
              <span
                className={cn(
                  "relative z-10 flex size-6 items-center justify-center rounded-full text-[11px] font-semibold tabular",
                  done && "bg-positive text-white dark:text-on-primary",
                  now && "bg-accent text-white ring-4 ring-accent-soft dark:text-on-primary",
                  !done && !now && "border border-control bg-surface text-muted",
                )}
              >
                {done ? (
                  <>
                    <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                    <span className="sr-only">Done:</span>
                  </>
                ) : (
                  index + 1
                )}
              </span>
              <span className={cn("mt-2 px-0.5 text-[11px] font-medium leading-tight sm:text-xs", now ? "text-accent" : done ? "text-ink" : "text-muted")}>
                {step.title}
              </span>
              {step.at ? (
                <span className="mt-0.5 hidden text-[11px] text-muted sm:block">{shortDate(step.at)}</span>
              ) : step.due ? (
                <span className="mt-0.5 hidden text-[11px] text-muted sm:block">by {shortDate(step.due)}</span>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className={cn("mt-4 flex items-start gap-2.5 rounded-control px-3 py-2.5 text-sm", isCurrent ? "bg-accent-soft text-ink" : "bg-status-completed-soft text-status-completed")}>
        {isCurrent ? (
          <span className="relative mt-1.5 flex size-2 shrink-0" aria-hidden="true">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-accent" />
          </span>
        ) : (
          <Check className="mt-0.5 size-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
        )}
        <p>
          <span className="font-semibold">
            {isCurrent ? "Now: " : ""}
            {current.title}.
          </span>{" "}
          {current.description}
          {current.at ? (
            <span className="text-muted"> · {longDate(current.at)}</span>
          ) : isCurrent && current.due ? (
            <span className="text-muted"> · Expected by {longDate(current.due)}</span>
          ) : null}
        </p>
      </div>
    </section>
  );
}
