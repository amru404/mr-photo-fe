"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DaysPicker } from "@/components/ui/days-picker";
import { useConfirm, useToast } from "@/components/ui/feedback";
import { FieldError } from "@/components/ui/field";
import { LoadError } from "@/components/ui/notice";
import { PanelFooter } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/spinner";
import { api, ApiError, type FieldErrors } from "@/lib/api";
import { cn } from "@/lib/cn";
import { count, longDate, shortDate } from "@/lib/format";
import type { ProjectDetail, StageValue, TimelineEntry, TimelineTab as Timeline } from "@/lib/types";
import { useOptions } from "@/features/projects/use-options";
import { projectKey } from "./use-project";

export function TimelineTab({ project }: { project: ProjectDetail }) {
  const client = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const options = useOptions();
  const key = [...projectKey(project.id), "timeline"];
  const [durations, setDurations] = useState<Record<string, number | "">>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState<string | null>(null);

  const timeline = useQuery({ queryKey: key, queryFn: () => api.get<Timeline>(`/projects/${project.id}/timeline`) });

  useEffect(() => {
    if (timeline.data) setDurations(timeline.data.durations);
  }, [timeline.data]);

  function applyResult(result: Timeline) {
    client.setQueryData(key, result);
    client.invalidateQueries({ queryKey: projectKey(project.id), exact: true });
    client.invalidateQueries({ queryKey: ["overview"] });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy("save");
    setErrors({});
    try {
      applyResult(await api.put<Timeline>(`/projects/${project.id}/timeline`, { durations }));
      toast("Timeline saved.");
    } catch (error) {
      if (error instanceof ApiError && error.isValidation) setErrors(error.errors);
      else throw error;
    } finally {
      setBusy(null);
    }
  }

  async function completeStage(stage: StageValue, label: string) {
    const ok = await confirm({ title: `Mark “${label}” as done?`, message: "The next stage starts now.", confirmLabel: "Mark done" });
    if (!ok) return;
    setBusy(stage);
    try {
      applyResult(await api.post<Timeline>(`/projects/${project.id}/timeline/complete`, { stage }));
    } finally {
      setBusy(null);
    }
  }

  if (timeline.isPending || options.isPending) return <Skeleton className="h-96 w-full rounded-card" />;
  if (timeline.isError || options.isError) return <LoadError what="the timeline" onRetry={() => timeline.refetch()} />;

  const entries = timeline.data.entries;
  const empty = entries.length === 0;
  const current = entries.find((entry) => entry.state === "current");

  return (
    <div className="space-y-6">
      {!empty && <Schedule entries={entries} current={current} />}

      <form onSubmit={save} noValidate>
        <section className="overflow-hidden rounded-card border border-line bg-surface">
          <header className="px-5 pb-1 pt-5">
            <h2 className="text-section font-semibold">{empty ? "Set up a timeline" : "Stages"}</h2>
            <p className="mt-1 text-sm text-muted">
              {empty
                ? "Choose how many days each stage gets; stages this project has already passed are marked done."
                : "Each stage starts as soon as the one before it is done, so finishing early moves every later date forward."}
            </p>
          </header>

          <ol className="mt-3">
            {options.data.stages.map((stage, index) => {
              const entry = entries[index];
              const done = entry?.state === "done";
              const isCurrent = entry?.state === "current";
              const overdue = entry?.is_overdue ?? false;

              return (
                <li
                  key={stage.value}
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn("grid gap-4 border-t border-rule px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center", isCurrent && "bg-accent-soft/40")}
                >
                  <div className="flex min-w-0 gap-3.5">
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-medium",
                        done && "bg-ink text-ground",
                        isCurrent && (overdue ? "bg-negative text-white" : "bg-accent text-white"),
                        !done && !isCurrent && "border border-control text-muted",
                      )}
                    >
                      {done ? <Check className="size-3.5" strokeWidth={3} aria-label="Done" /> : index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{stage.label}</p>
                      <p className="text-[13px] text-muted">{stage.description}</p>
                      {entry && (
                        <p className="mt-1 font-mono text-xs text-muted tabular">
                          {shortDate(entry.starts_at)} → {shortDate(entry.ends_at)} ·{" "}
                          <span
                            className={cn(
                              done && "text-positive",
                              overdue && "font-medium text-negative",
                              isCurrent && !overdue && "font-medium text-accent",
                            )}
                          >
                            {done && entry.completed_at
                              ? `done ${shortDate(entry.completed_at)}`
                              : overdue
                                ? `overdue by ${count(Math.max(1, -entry.days_left), "day")}`
                                : isCurrent
                                  ? entry.days_left === 0
                                    ? "due today"
                                    : `due in ${count(entry.days_left, "day")}`
                                  : `${count(entry.days, "day")}`}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  {!done && (
                    <div className="flex flex-wrap items-center gap-3 ps-10 md:ps-0">
                      <DaysPicker
                        key={`${stage.value}-${timeline.dataUpdatedAt}`}
                        label={`${stage.label} duration`}
                        presets={options.data.timeline_presets}
                        max={options.data.timeline_max_days}
                        value={durations[stage.value] ?? stage.default_days}
                        onChange={(days) => setDurations((value) => ({ ...value, [stage.value]: days }))}
                      />
                      {isCurrent && (
                        <Button size="sm" variant="primary" loading={busy === stage.value} onClick={() => completeStage(stage.value, stage.label)}>
                          Mark done
                        </Button>
                      )}
                      <FieldError message={errors[`durations.${stage.value}`]?.[0]} className="w-full" />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          {(empty || current) && (
            <PanelFooter>
              <Button type="submit" variant="primary" loading={busy === "save"}>
                {empty ? "Create timeline" : "Save durations"}
              </Button>
            </PanelFooter>
          )}
        </section>
      </form>
    </div>
  );
}

/** The stages as one bar, each as wide as its days, with today marked. */
function Schedule({ entries, current }: { entries: TimelineEntry[]; current?: TimelineEntry }) {
  const start = new Date(entries[0].starts_at).getTime();
  const end = new Date(entries[entries.length - 1].ends_at).getTime();
  const span = Math.max(1, end - start);
  const now = Date.now();
  const todayAt = Math.min(1, Math.max(0, (now - start) / span));
  const last = entries[entries.length - 1];

  return (
    <section className="rounded-card border border-line bg-surface p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-faint">Schedule</p>
          <h2 className="mt-0.5 text-section font-semibold">
            {current ? `${current.label}${current.is_overdue ? " is overdue" : ` · due ${longDate(current.due_at)}`}` : "All stages done"}
          </h2>
        </div>
        <dl className="flex gap-6 text-sm">
          <div>
            <dt className="text-xs text-muted">Started</dt>
            <dd className="font-mono tabular">{shortDate(entries[0].starts_at)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{current ? "Est. finish" : "Finished"}</dt>
            <dd className="font-mono tabular">{shortDate(last.ends_at)}</dd>
          </div>
        </dl>
      </div>

      <div className="relative mt-6 pb-6">
        <div className="flex h-9 gap-[2px] overflow-hidden rounded-control">
          {entries.map((entry) => {
            const from = new Date(entry.starts_at).getTime();
            const to = new Date(entry.ends_at).getTime();
            return (
              <div
                key={entry.stage}
                title={`${entry.label}: ${shortDate(entry.starts_at)} → ${shortDate(entry.ends_at)}`}
                className={cn(
                  "flex min-w-0 items-center px-2.5 text-xs font-medium",
                  entry.state === "done" && "bg-ink text-ground",
                  entry.state === "current" && (entry.is_overdue ? "bg-negative text-white" : "bg-accent text-white"),
                  entry.state === "upcoming" && "bg-raised text-muted",
                )}
                style={{ flexGrow: Math.max(to - from, span * 0.04) }}
              >
                <span className="truncate">{entry.label}</span>
              </div>
            );
          })}
        </div>
        {now >= start && now <= end + 86_400_000 && (
          <div className="pointer-events-none absolute -top-1 bottom-0" style={{ left: `${todayAt * 100}%` }}>
            <span className="block h-11 w-0.5 -translate-x-1/2 bg-ink" />
            <span className="absolute top-12 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] font-medium text-ink">Today</span>
          </div>
        )}
      </div>
    </section>
  );
}
