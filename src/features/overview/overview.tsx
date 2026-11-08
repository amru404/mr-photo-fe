"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, RotateCcw, X } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, LoadError } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { useUser } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { count, longDate, number, relative, shortDate } from "@/lib/format";
import type { Overview, OverviewProject } from "@/lib/types";
import { useTitle } from "@/lib/use-title";
import { mountStudio, STUDIO_COLORS, type StudioScene, type StudioStation } from "./studio-scene";

// --- Stations ---------------------------------------------------------------

const STATIONS: (StudioStation & { hint: string })[] = [
  { label: "Set up", color: "purple", hint: "Gallery created, not shared for picking yet" },
  { label: "Picking", color: "blue", hint: "The client is choosing favorites" },
  { label: "Review", color: "teal", hint: "Picks are in, waiting for you" },
  { label: "Editing", color: "coral", hint: "You are editing the picks" },
  { label: "Payment", color: "amber", hint: "Delivered, payment not confirmed" },
  { label: "Done", color: "green", hint: "Delivered and settled" },
];

function stationOf(p: OverviewProject): number {
  switch (p.status.value) {
    case "completed":
      return p.requires_payment && !p.paid_at ? 4 : 5;
    case "editing":
      return 3;
    case "draft":
      return p.selection_submitted_at ? 2 : 0;
    default:
      return p.selection_submitted_at ? 2 : 1;
  }
}

function due(p: OverviewProject) {
  const s = p.stage;
  if (!s) return "—";
  if (s.is_overdue) return `Overdue ${count(Math.max(1, -s.days_left), "day")}`;
  return s.days_left === 0 ? "Today" : shortDate(s.due_at);
}

/** Three facts per project, chosen for the station it sits in. */
function facts(p: OverviewProject, station: number): [string, ReactNode][] {
  const picked = `${number(p.selections_count)}${p.max_selectable_photos ? ` of ${p.max_selectable_photos}` : ""}`;
  switch (station) {
    case 0:
      return [["Frames", number(p.photos_count)], ["Shoot", p.shoot_date ? longDate(p.shoot_date) : "—"], ["Category", p.category ?? "—"]];
    case 1:
      return [["Picked", picked], ["Link", p.share_expired ? <span className="text-negative">Expired</span> : "Active"], ["Due", due(p)]];
    case 2:
      return [["Picked", picked], ["Submitted", p.selection_submitted_at ? relative(p.selection_submitted_at) : "—"], ["Due", due(p)]];
    case 3:
      return [["To edit", number(p.selections_count)], ["Finals synced", number(p.finals_count)], ["Due", due(p)]];
    case 4:
      return [["Finals", number(p.finals_count)], ["Payment", <span className="text-status-selection">Awaiting</span>], ["Updated", relative(p.updated_at)]];
    default:
      return [["Finals", number(p.finals_count)], ["Payment", p.requires_payment ? "Paid" : "Not required"], ["Shoot", p.shoot_date ? longDate(p.shoot_date) : "—"]];
  }
}

type Flag = "review" | "overdue" | "unpaid" | "picking";

const FLAGS: Record<Flag, { label: string; tone: "bad" | "warn" | "info"; test: (p: OverviewProject, station: number) => boolean }> = {
  review: { label: "Selections to review", tone: "warn", test: (_, s) => s === 2 },
  overdue: { label: "Overdue stages", tone: "bad", test: (p) => !!p.stage?.is_overdue },
  unpaid: { label: "Unpaid deliveries", tone: "warn", test: (p) => p.requires_payment && !p.paid_at && ["editing", "completed"].includes(p.status.value) },
  picking: { label: "Clients still picking", tone: "info", test: (_, s) => s === 1 },
};

function initials(name: string) {
  return name.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w[0] ?? "")).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "·";
}

// --- Screen -----------------------------------------------------------------

export function OverviewScreen() {
  useTitle("Overview");
  const { data: user } = useUser();
  const [active, setActive] = useState(-1);
  const [flags, setFlags] = useState<Flag[]>([]);
  const toggleFlag = (flag: Flag) => setFlags((current) => (current.includes(flag) ? current.filter((f) => f !== flag) : [...current, flag]));

  const overview = useQuery({
    queryKey: ["overview"],
    queryFn: () => api.get<Overview>("/dashboard/overview"),
    refetchInterval: 60_000,
  });

  const data = overview.data;
  const placed = useMemo(() => (data?.projects ?? []).map((project) => ({ project, station: stationOf(project) })), [data]);
  const counts = useMemo(() => STATIONS.map((_, i) => placed.filter((p) => p.station === i).length), [placed]);
  const select = (i: number) => setActive((current) => (i < 0 || current === i ? -1 : i));

  if (overview.isPending) return <OverviewSkeleton />;
  if (overview.isError)
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-10">
        <LoadError what="your overview" onRetry={() => overview.refetch()} />
      </div>
    );
  if (!data || data.kpis.projects === 0)
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-10">
        <EmptyState
          title={`Welcome${user ? `, ${user.name.split(" ")[0]}` : ""}`}
          action={
            <ButtonLink href="/projects/new" variant="primary">
              Create your first project
            </ButtonLink>
          }
        >
          Share a Google Drive folder, paste its link, and your client gets a private gallery to pick favorites.
        </EmptyState>
      </div>
    );

  const list = placed.filter(
    (p) => (active < 0 || p.station === active) && (flags.length === 0 || flags.some((flag) => FLAGS[flag].test(p.project, p.station))),
  );
  const flagCount = (flag: Flag) => placed.filter((p) => FLAGS[flag].test(p.project, p.station)).length;

  return (
    <div className="px-4 pb-10 sm:px-6 lg:px-10">
      <StationChips active={active} counts={counts} total={placed.length} onSelect={select} />

      <div className="mt-4 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)_360px]">
        {/* Left deck */}
        <div className="order-2 space-y-4 lg:order-1">
          <Deck title="Studio data">
            <dl className="space-y-1.5">
              {(
                [
                  ["Projects", number(data.kpis.projects)],
                  ["In progress", number(data.kpis.active)],
                  ["Frames", number(data.kpis.photos)],
                  ["Client picks", number(data.kpis.selections)],
                  ["Delivered · 30d", number(data.kpis.delivered_30d)],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 text-[13px]">
                  <dt className="text-muted">{label}</dt>
                  <dd className="min-w-20 rounded-[8px] bg-raised px-2.5 py-1 text-end font-mono text-ink tabular">{value}</dd>
                </div>
              ))}
            </dl>
          </Deck>

          <Deck
            title="Status filters"
            aside={
              flags.length > 0 && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    setFlags([]);
                  }}
                  className="text-[11px] font-medium text-muted underline underline-offset-2 hover:text-ink"
                >
                  Reset
                </span>
              )
            }
          >
            <ul className="space-y-1.5">
              {(Object.keys(FLAGS) as Flag[]).map((flag) => (
                <Signal key={flag} label={FLAGS[flag].label} value={flagCount(flag)} tone={FLAGS[flag].tone} on={flags.includes(flag)} onToggle={() => toggleFlag(flag)} />
              ))}
            </ul>
            <p className="mt-2.5 text-[11px] text-faint">Switch on to narrow the project list on the right.</p>
          </Deck>

          <Deck title="Needs you" aside={<span className="font-mono text-xs text-faint">{data.attention.length}</span>}>
            {data.attention.length === 0 ? (
              <p className="text-[13px] text-muted">All clear. Nothing is waiting on you.</p>
            ) : (
              <ul className="-mx-1 space-y-0.5">
                {data.attention.slice(0, 5).map((item, index) => (
                  <li key={`${item.project.id}-${item.kind}-${index}`}>
                    <Link href={`/projects/${item.project.id}?tab=${item.tab}`} className="group flex items-start gap-2.5 rounded-[8px] px-1 py-1.5 hover:bg-raised">
                      <span
                        className={cn(
                          "mt-1.5 size-1.5 shrink-0 rounded-full",
                          item.kind === "overdue" ? "bg-negative" : item.kind === "review" ? "bg-accent" : "bg-status-selection",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">{item.label}</span>
                        <span className="block truncate text-xs text-muted">{item.project.title}</span>
                      </span>
                      <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-faint group-hover:text-ink" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Deck>
        </div>

        {/* The studio */}
        <section className="relative order-1 flex flex-col overflow-hidden rounded-[20px] border border-line bg-surface lg:order-2">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(var(--rule)_1px,transparent_1px),linear-gradient(90deg,var(--rule)_1px,transparent_1px)] [background-size:44px_44px]" />
          <div className="relative flex items-start justify-between gap-4 p-5">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-faint">Studio floor</p>
              <p className="mt-1 text-sm font-semibold text-ink">{active < 0 ? "Every stage at once" : STATIONS[active].label}</p>
              <p className="text-xs text-muted">{active < 0 ? "Click a station to filter your projects" : STATIONS[active].hint}</p>
            </div>
            {active >= 0 && (
              <button
                type="button"
                onClick={() => select(-1)}
                className="flex size-9 items-center justify-center rounded-[10px] border border-line bg-raised text-muted hover:text-ink"
                aria-label="Show every stage"
                title="Show every stage"
              >
                <RotateCcw className="size-4" />
              </button>
            )}
          </div>
          <Studio active={active} counts={counts} onSelect={select} />
        </section>

        {/* Right deck: the filtered projects */}
        <aside className="order-3 lg:col-span-2 2xl:col-span-1">
          <ProjectPanel
            active={active}
            list={list}
            filters={flags.map((flag) => FLAGS[flag].label)}
            onClear={() => {
              select(-1);
              setFlags([]);
            }}
          />
        </aside>
      </div>

      {/* Bottom cards */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ActivityCard data={data.engagement} />
        <DeadlineCard deadlines={data.deadlines} />
        <DeliveredCard data={data} counts={counts} />
      </div>
    </div>
  );
}

// --- Pieces -----------------------------------------------------------------

function StationChips({ active, counts, total, onSelect }: { active: number; counts: number[]; total: number; onSelect: (i: number) => void }) {
  const strip = useRef<HTMLDivElement>(null);
  const nudge = (dir: number) => strip.current?.scrollBy({ left: dir * 240, behavior: "smooth" });
  return (
    <div className="flex items-center justify-center gap-2">
      <button type="button" onClick={() => nudge(-1)} aria-label="Scroll stages left" className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-line bg-surface text-muted hover:text-ink md:hidden">
        <ChevronLeft className="size-4" />
      </button>
      <div ref={strip} className="no-scrollbar flex gap-1.5 overflow-x-auto rounded-[14px] border border-line bg-surface p-1">
        <Chip on={active < 0} onClick={() => onSelect(-1)}>
          All <span className="font-mono text-[11px] opacity-60">{total}</span>
        </Chip>
        {STATIONS.map((station, i) => (
          <Chip key={station.label} on={active === i} onClick={() => onSelect(i)}>
            <span className="size-2 rounded-full" style={{ background: STUDIO_COLORS[station.color].r }} />
            {station.label}
            <span className="font-mono text-[11px] opacity-60">{counts[i]}</span>
          </Chip>
        ))}
      </div>
      <button type="button" onClick={() => nudge(1)} aria-label="Scroll stages right" className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-line bg-surface text-muted hover:text-ink md:hidden">
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] px-3.5 text-[12px] font-semibold uppercase tracking-[0.05em] transition-colors",
        on ? "bg-ink text-ground" : "text-muted hover:bg-raised hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Studio({ active, counts, onSelect }: { active: number; counts: number[]; onSelect: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const scene = useRef<StudioScene | null>(null);
  const select = useRef(onSelect);
  select.current = onSelect;

  useEffect(() => {
    scene.current = mountStudio(ref.current!, STATIONS, (i) => select.current(i));
    return () => scene.current?.destroy();
  }, []);
  useEffect(() => scene.current?.setActive(active), [active]);
  useEffect(() => scene.current?.setCounts(counts), [counts]);

  return (
    <div className="relative flex flex-1 items-center justify-center px-4 pb-5">
      <div ref={ref} className="w-full max-w-[560px] [&_text]:font-sans" />
    </div>
  );
}

/** A floating deck panel with a collapsible body, like the reference's side controls. */
function Deck({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="rounded-[16px] border border-line bg-surface">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-4 py-3">
        <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink">{title}</span>
        <span className="flex items-center gap-2">
          {aside}
          <ChevronDown className={cn("size-4 text-faint transition-transform", !open && "-rotate-90")} />
        </span>
      </button>
      {open && <div className="border-t border-rule px-4 pb-4 pt-3">{children}</div>}
    </section>
  );
}

function Signal({ label, value, tone, on, onToggle }: { label: string; value: number; tone: "bad" | "warn" | "info"; on: boolean; onToggle: () => void }) {
  return (
    <li>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-[10px] px-3 py-2.5 text-start transition-colors",
          on ? "bg-active" : "bg-raised hover:bg-active",
        )}
      >
        <span className={cn("text-[13px]", on || value > 0 ? "text-ink" : "text-muted")}>{label}</span>
        <span className="flex items-center gap-2.5">
          <span className={cn("font-mono text-xs tabular", value > 0 && tone === "bad" ? "text-negative" : "text-muted")}>{value}</span>
          <span className={cn("flex h-5 w-9 items-center rounded-full p-0.5 transition-colors", on ? "bg-positive" : "bg-control")}>
            <span className={cn("size-4 rounded-full bg-white shadow-sm transition-transform", on ? "translate-x-4" : "translate-x-0")} />
          </span>
        </span>
      </button>
    </li>
  );
}

function ProjectPanel({
  active,
  list,
  filters,
  onClear,
}: {
  active: number;
  list: { project: OverviewProject; station: number }[];
  filters: string[];
  onClear: () => void;
}) {
  const station = active >= 0 ? STATIONS[active] : null;
  const color = station ? STUDIO_COLORS[station.color] : null;

  return (
    <section className="flex max-h-[760px] flex-col rounded-[16px] border border-line bg-surface 2xl:h-full">
      <header className="flex items-center gap-3 border-b border-rule px-4 py-3">
        {color && <span className="size-2.5 shrink-0 rounded-full" style={{ background: color.r }} />}
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink">{station ? station.label : "All projects"}</p>
          <p className="truncate text-xs text-muted">
            {count(list.length, "project")}
            {filters.length > 0 && ` · ${filters.join(" or ")}`}
          </p>
        </div>
        {(station || filters.length > 0) && (
          <button type="button" onClick={onClear} aria-label="Clear filter" className="flex size-8 items-center justify-center rounded-[8px] text-muted hover:bg-raised hover:text-ink">
            <X className="size-4" />
          </button>
        )}
      </header>

      {list.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13px] text-muted">No projects match this filter.</p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {list.map(({ project, station: s }) => {
            const c = STUDIO_COLORS[STATIONS[s].color];
            return (
              <li key={project.id}>
                <Link href={`/projects/${project.id}`} className="block rounded-[12px] border border-rule bg-ground/40 p-3 transition-colors hover:border-control">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold" style={{ background: c.t, color: c.d }}>
                      {project.cover_url ? <img src={project.cover_url} alt="" className="size-full object-cover" /> : initials(project.client_name ?? project.title)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-ink">{project.title}</p>
                      <p className="truncate text-xs text-muted">
                        {project.client_name ?? "No client"}
                        {project.category && ` · ${project.category}`}
                      </p>
                    </div>
                    {active < 0 && (
                      <span className="shrink-0 rounded-[6px] px-2 py-0.5 text-[11px] font-medium" style={{ background: c.t, color: c.d }}>
                        {STATIONS[s].label}
                      </span>
                    )}
                  </div>
                  {active >= 0 && (
                    <dl className="mt-2.5 divide-y divide-rule border-t border-rule text-xs">
                      {facts(project, s).map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-3 py-1.5">
                          <dt className="text-muted">{label}</dt>
                          <dd className="text-end font-medium text-ink">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function BottomCard({ title, children, className, highlight }: { title: string; children: ReactNode; className?: string; highlight?: boolean }) {
  return (
    <section
      className={cn(
        "flex min-h-[240px] flex-col rounded-[20px] border p-5",
        highlight ? "border-transparent bg-ink text-ground" : "border-line bg-surface",
        className,
      )}
    >
      <h2 className="text-center text-[12px] font-semibold uppercase tracking-[0.1em]">{title}</h2>
      {children}
    </section>
  );
}

function ActivityCard({ data }: { data: Overview["engagement"] }) {
  const totals = data.days.map((day) => day.opened + day.favorited + day.commented + day.submitted);
  const max = Math.max(1, ...totals);
  const sum = totals.reduce((a, b) => a + b, 0);

  return (
    <BottomCard title="Client activity">
      <p className="mt-4 text-center font-mono text-[2.5rem] font-medium leading-none tracking-[-0.04em] tabular">{number(sum)}</p>
      <p className="mt-1 text-center text-xs text-muted">actions · last 14 days</p>
      <ol className="mt-5 flex h-20 items-end gap-[3px]" aria-label="Client actions per day">
        {data.days.map((day, index) => {
          const total = totals[index];
          return (
            <li key={day.date} className="group relative flex h-full flex-1 items-end">
              <span
                className={cn("w-full rounded-t-[3px]", total ? "bg-accent group-hover:bg-accent-hover" : "h-1 bg-active")}
                style={total ? { height: `${Math.max(8, (total / max) * 100)}%` } : undefined}
              />
              <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-32 -translate-x-1/2 rounded-[8px] bg-ink px-2.5 py-2 text-[11px] text-ground shadow-float group-hover:block">
                <span className="block font-semibold">{shortDate(day.date)}</span>
                <span className="block font-mono">
                  {day.opened} visits · {day.favorited} ♥ · {day.commented} comments
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-auto flex justify-between pt-4 text-xs text-muted">
        <span>
          Favorites <b className="font-mono font-medium text-ink">{data.totals.favorited}</b>
        </span>
        <span>
          Comments <b className="font-mono font-medium text-ink">{data.totals.commented}</b>
        </span>
        <span>
          Submitted <b className="font-mono font-medium text-ink">{data.totals.submitted}</b>
        </span>
      </div>
    </BottomCard>
  );
}

/** The highlighted card: the one date that matters most right now. */
function DeadlineCard({ deadlines }: { deadlines: Overview["deadlines"] }) {
  const next = deadlines[0];
  return (
    <BottomCard title="Next deadline" highlight>
      {!next ? (
        <p className="m-auto text-sm opacity-70">No open stages with a due date.</p>
      ) : (
        <>
          <div className="mt-4 flex justify-center">
            <span className={cn("rounded-[8px] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-white", next.is_overdue ? "bg-negative" : "bg-accent")}>
              {next.is_overdue ? `Overdue ${count(Math.max(1, -next.days_left), "day")}` : next.days_left === 0 ? "Due today" : `In ${count(next.days_left, "day")}`}
            </span>
          </div>
          <p className="mt-3 text-center font-mono text-[2.5rem] font-medium leading-none tracking-[-0.04em]">{shortDate(next.due_at)}</p>
          <p className="mt-2 truncate text-center text-sm font-semibold">{next.project.title}</p>
          <p className="text-center text-xs opacity-60">{next.label}</p>
          <div className="mt-auto flex items-end justify-between gap-3 pt-4">
            <ul className="min-w-0 space-y-0.5 text-xs opacity-70">
              {deadlines.slice(1, 3).map((d) => (
                <li key={`${d.project.id}-${d.stage}`} className="truncate">
                  <span className="font-mono">{shortDate(d.due_at)}</span> · {d.project.title}
                </li>
              ))}
            </ul>
            <Link href={`/projects/${next.project.id}?tab=timeline`} className="shrink-0 text-xs font-semibold uppercase tracking-[0.06em] underline underline-offset-4">
              Open
            </Link>
          </div>
        </>
      )}
    </BottomCard>
  );
}

function DeliveredCard({ data, counts }: { data: Overview; counts: number[] }) {
  const total = Math.max(1, data.kpis.projects);
  const delivered = counts[4] + counts[5];
  const percent = Math.round((delivered / total) * 100);
  return (
    <BottomCard title="Delivery rate" className="text-start">
      <div className="mt-4 flex flex-1 flex-col justify-between">
        <div>
          <p className="font-mono text-[2.5rem] font-medium leading-none tracking-[-0.04em] tabular">{percent}%</p>
          <p className="mt-1 text-xs text-muted">
            {count(delivered, "project")} delivered of {number(data.kpis.projects)}
          </p>
        </div>
        <div>
          <div className="mt-5 flex h-2.5 gap-[2px] overflow-hidden rounded-full bg-active" aria-hidden="true">
            {STATIONS.map((station, i) =>
              counts[i] ? <span key={station.label} style={{ flexGrow: counts[i], background: STUDIO_COLORS[station.color].r }} /> : null,
            )}
          </div>
          <ul className="mt-3 grid grid-cols-3 gap-x-3 gap-y-1 text-[11px] text-muted">
            {STATIONS.map((station, i) => (
              <li key={station.label} className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full" style={{ background: STUDIO_COLORS[station.color].r }} />
                {station.label} <span className="font-mono text-ink">{counts[i]}</span>
              </li>
            ))}
          </ul>
          <Link href="/activity" className="mt-4 inline-block text-xs font-semibold uppercase tracking-[0.06em] text-ink underline underline-offset-4">
            View activity
          </Link>
        </div>
      </div>
    </BottomCard>
  );
}

function OverviewSkeleton() {
  return (
    <div className="px-4 pb-10 sm:px-6 lg:px-10">
      <Skeleton className="mx-auto h-10 w-[640px] max-w-full rounded-[14px]" />
      <div className="mt-4 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Skeleton className="h-52 w-full rounded-[16px]" />
          <Skeleton className="h-44 w-full rounded-[16px]" />
        </div>
        <Skeleton className="h-[520px] w-full rounded-[20px]" />
        <Skeleton className="hidden h-[520px] w-full rounded-[16px] 2xl:block" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-64 w-full rounded-[20px]" />
        ))}
      </div>
    </div>
  );
}

