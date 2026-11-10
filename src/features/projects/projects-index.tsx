"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CalendarClock, Check, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, ImageOff, LayoutGrid, Link2, List, Plus, Search, X } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { writeClipboard } from "@/components/ui/copy-button";
import { CopyRowAction, RowAction, SortHeader, TABLE_HEAD, type SortState } from "@/components/ui/table";
import { PaymentBadge } from "@/components/ui/payment";
import { EmptyState, LoadError, Notice } from "@/components/ui/notice";
import { Meter } from "@/components/ui/meter";
import { Skeleton, Spinner } from "@/components/ui/spinner";
import { api, query } from "@/lib/api";
import { cn } from "@/lib/cn";
import { flash } from "@/lib/flash";
import { count, longDate, number, relative } from "@/lib/format";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/labels";
import type { Paginated, ProjectList, ProjectStatusValue, ProjectSummary } from "@/lib/types";
import { useQueryState } from "@/lib/use-query-state";
import { STATUS_TONE } from "@/lib/status-tone";
import { useTitle } from "@/lib/use-title";
import { useClientOptions } from "@/features/clients/use-clients";

type Layout = "cards" | "table";

/** Compact cards: two on a phone, up to six across on a wide screen. */
export const CARD_GRID = "grid grid-cols-2 gap-3 p-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6";

export function ProjectsIndex() {
  useTitle("Projects");
  const url = useQueryState();
  const status = url.get("status") as ProjectStatusValue | "";
  const layout: Layout = url.get("layout") === "table" ? "table" : "cards";
  const page = Number(url.get("page", "1")) || 1;
  const clientId = Number(url.get("client_id")) || null;
  // No sort in the URL means newest first, which the table shows as no active column.
  const sort: SortState = { sort: url.get("sort"), direction: url.get("direction") === "asc" ? "asc" : "desc" };
  const setSort = (next: SortState) => url.set({ sort: next.sort, direction: next.direction, page: null });
  const clients = useClientOptions();
  const [search, setSearch] = useState(url.get("search"));
  const [debounced, setDebounced] = useState(search);
  const [created] = useState(() => flash.take());

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (debounced !== url.get("search")) url.set({ search: debounced, page: null });
  }, [debounced]);

  const list = useQuery({
    queryKey: ["projects", { search: debounced, status, page, client: clientId, sort: sort.sort, direction: sort.direction }],
    queryFn: () =>
      api.get<ProjectList>(
        `/projects${query({ search: debounced, status, client_id: clientId, sort: sort.sort || null, direction: sort.sort ? sort.direction : null, page: page > 1 ? page : null })}`,
      ),
    placeholderData: keepPreviousData,
    refetchInterval: (q) => (q.state.data?.is_syncing ? 5_000 : false),
    notifyOnChangeProps: ["data", "error"],
  });

  const filtering = debounced !== "" || status !== "" || clientId !== null;
  const clientName = clientId ? (clients.data?.find((client) => client.id === clientId)?.name ?? "this client") : null;
  const setStatus = (value: string) => url.set({ status: value, page: null });

  return (
    <div className="px-4 pb-10 pt-5 sm:px-6 lg:px-10">
      {created && (
        <Notice tone="success" className="mb-4">
          {created}
        </Notice>
      )}

      {/* Toolbar: status chips like the Overview stations, then search, layout and the primary action. */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="no-scrollbar overflow-x-auto">
          <div role="group" aria-label="Filter by status" className="inline-flex items-center gap-1 rounded-[12px] border border-line bg-surface p-1">
            <Chip on={status === ""} onClick={() => setStatus("")}>
              All
              {list.data && <ChipCount on={status === ""}>{list.data.total_count}</ChipCount>}
            </Chip>
            {STATUS_ORDER.map((value) => (
              <Chip key={value} on={status === value} onClick={() => setStatus(value)}>
                <span className="size-2 rounded-full" style={{ background: STATUS_TONE[value].r }} />
                {STATUS_LABELS[value]}
                {list.data && <ChipCount on={status === value}>{list.data.status_counts[value]}</ChipCount>}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="relative flex h-[42px] min-w-0 flex-1 items-center rounded-[12px] border border-line bg-surface xl:w-72 xl:flex-none">
            <Search className="pointer-events-none absolute start-3 size-4 text-faint" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, client or email"
              aria-label="Search projects"
              className="size-full rounded-[12px] bg-transparent ps-9 pe-3 text-[13px] text-ink outline-none placeholder:text-faint focus-visible:ring-2 focus-visible:ring-accent-track"
            />
          </label>

          {(clientId !== null || (clients.data?.length ?? 0) > 0) && (
            <label className="relative hidden h-[42px] shrink-0 items-center rounded-[12px] border border-line bg-surface sm:flex">
              <span className="sr-only">Filter by client</span>
              <select
                value={clientId ?? ""}
                onChange={(event) => url.set({ client_id: event.target.value || null, page: null })}
                className={cn(
                  "h-full max-w-48 appearance-none truncate rounded-[12px] bg-transparent ps-3 pe-8 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-track",
                  clientId ? "font-medium text-ink" : "text-muted",
                )}
              >
                <option value="">All clients</option>
                {clientId !== null && !clients.data?.some((client) => client.id === clientId) && <option value={clientId}>{clientName}</option>}
                {clients.data?.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute end-2.5 size-4 text-faint" aria-hidden="true" />
            </label>
          )}

          <div role="radiogroup" aria-label="Layout" className="inline-flex shrink-0 gap-1 rounded-[12px] border border-line bg-surface p-1">
            {(
              [
                ["cards", "Cards", LayoutGrid],
                ["table", "Table", List],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={layout === value}
                aria-label={label}
                title={label}
                onClick={() => url.set({ layout: value }, { defaults: { layout: "cards" } })}
                className={cn(
                  "flex size-8 items-center justify-center rounded-[8px] transition-colors",
                  layout === value ? "bg-ink text-ground" : "text-muted hover:bg-raised hover:text-ink",
                )}
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>

          <Link
            href="/projects/new"
            aria-label="New project"
            className="inline-flex h-[42px] shrink-0 items-center gap-2 rounded-[12px] bg-primary px-3.5 text-[13px] font-semibold text-on-primary transition-colors hover:bg-primary-hover sm:px-4"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">New project</span>
          </Link>
        </div>
      </div>

      {/* The board: one framed panel, headed like the Overview "Studio floor". */}
      <section className="relative mt-4 overflow-hidden rounded-[20px] border border-line bg-surface">
        <header className="flex items-start justify-between gap-4 border-b border-rule p-5">
          <div className="flex min-w-0 items-start gap-3">
            {status && <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: STATUS_TONE[status].r }} />}
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-faint">Projects</p>
              <p className="mt-1 text-sm font-semibold text-ink">{status ? STATUS_LABELS[status] : "Every client gallery"}</p>
              <p className="truncate text-xs text-muted">
                {list.data ? count(list.data.meta.total, "project") : "Loading…"}
                {clientName && ` for ${clientName}`}
                {debounced && ` matching “${debounced}”`}
              </p>
            </div>
          </div>
          {filtering && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                url.set({ status: "", search: "", client_id: null, page: null });
              }}
              aria-label="Clear filters"
              title="Clear filters"
              className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-line bg-raised text-muted hover:text-ink"
            >
              <X className="size-4" />
            </button>
          )}
        </header>

        {list.isPending ? (
          <CardsSkeleton />
        ) : list.isError ? (
          <div className="p-4">
            <LoadError what="your projects" onRetry={() => list.refetch()} />
          </div>
        ) : list.data.data.length === 0 ? (
          <div className="p-4">
            {filtering ? (
              <EmptyState title="No projects match">Try a different search, status or client.</EmptyState>
            ) : (
              <EmptyState
                title="No projects yet"
                action={
                  <ButtonLink href="/projects/new" variant="primary">
                    New project
                  </ButtonLink>
                }
              >
                Book your first shoot. Photos can come later — connect the Google Drive folder whenever they&rsquo;re ready.
              </EmptyState>
            )}
          </div>
        ) : (
          <>
            {layout === "cards" ? (
              <ul className={CARD_GRID}>
                {list.data.data.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </ul>
            ) : (
              <ProjectTable projects={list.data.data} sort={sort} onSort={setSort} />
            )}
            <Pager meta={list.data.meta} onPage={(next) => url.set({ page: next > 1 ? next : null })} />
          </>
        )}
      </section>
    </div>
  );
}

// --- Pieces -----------------------------------------------------------------

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] px-3.5 text-[13px] font-semibold transition-colors",
        on ? "bg-ink text-ground" : "text-muted hover:bg-raised hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

export function ChipCount({ on, children }: { on: boolean; children: ReactNode }) {
  return <span className={cn("font-mono text-[11px] font-normal tracking-normal tabular", on ? "opacity-70" : "text-faint")}>{children}</span>;
}

/** A draft with no Drive folder yet is a booking. */
export function isBooked(project: Pick<ProjectSummary, "status" | "has_photos_folder">): boolean {
  return project.status.value === "draft" && !project.has_photos_folder;
}

function StatusTag({ project }: { project: ProjectSummary }) {
  const { status } = project;
  const tone = STATUS_TONE[status.value];
  return (
    <span className="inline-flex shrink-0 items-center rounded-[6px] px-2 py-0.5 text-[11px] font-medium" style={{ background: tone.t, color: tone.d }}>
      {isBooked(project) ? "Booked" : (STATUS_LABELS[status.value] ?? status.label)}
    </span>
  );
}

function syncState(project: ProjectSummary) {
  const synced = project.last_synced_at !== null;
  return {
    synced,
    caching: synced && project.photos_count > 0 && project.cached_photos_count < project.photos_count,
    waiting: project.has_photos_folder && (!synced || project.photos_count > 0),
  };
}

function shoot(project: ProjectSummary) {
  if (!project.shoot_date) return "—";
  return `${longDate(project.shoot_date)}${project.shoot_time ? `, ${project.shoot_time.slice(0, 5)}` : ""}`;
}

function Cover({ project, className, small }: { project: ProjectSummary; className?: string; small?: boolean }) {
  const { waiting } = syncState(project);
  return (
    <div className={cn("overflow-hidden bg-raised", className)}>
      {project.cover_url ? (
        <img src={small ? `${project.cover_url}?size=grid` : project.cover_url} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      ) : (
        <div
          className="flex size-full items-center justify-center text-faint"
          title={!project.has_photos_folder ? "Booked — Drive folder not connected yet" : waiting ? "Syncing photos…" : "No photos in folder"}
        >
          {!project.has_photos_folder ? (
            <CalendarClock className="size-5" strokeWidth={1.5} />
          ) : waiting ? (
            <Spinner className="size-4" />
          ) : (
            <ImageOff className="size-5" strokeWidth={1.5} />
          )}
        </div>
      )}
    </div>
  );
}

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const { caching, synced } = syncState(project);
  return (
    <li className="relative">
      <Link href={`/projects/${project.id}`} className="group block h-full rounded-[14px] border border-rule bg-ground/40 p-2 transition-colors hover:border-control">
        <Cover project={project} className="aspect-[4/3] w-full rounded-[10px]" small />
        <div className="px-0.5 pt-2">
          <div className="flex flex-col items-start gap-1.5">
            <div className="w-full min-w-0">
              <p className="truncate text-[13px] font-semibold text-ink">{project.title}</p>
              <p className="truncate text-xs text-muted">
                {project.client_name ?? "No client"}
                {project.category && ` · ${project.category}`}
              </p>
            </div>
            <span className="flex flex-wrap items-center gap-1">
              <StatusTag project={project} />
              <PaymentBadge percent={project.paid_percent} />
            </span>
          </div>

          {caching ? (
            <div className="mt-2 border-t border-rule pt-2">
              <div className="flex justify-between font-mono text-[11px] text-muted tabular">
                <span>Caching previews</span>
                <span>
                  {number(project.cached_photos_count)}/{number(project.photos_count)}
                </span>
              </div>
              <Meter value={project.cached_photos_count} max={project.photos_count} className="mt-1" label="Previews cached" />
            </div>
          ) : (
            <dl className="mt-2 divide-y divide-rule border-t border-rule text-[11px]">
              <div className="flex justify-between gap-2 py-1">
                <dt className="text-muted">Frames</dt>
                <dd className="font-mono font-medium text-ink tabular">
                  {!project.has_photos_folder ? <span className="font-sans text-muted">Not connected</span> : synced ? number(project.photos_count) : "Syncing…"}
                </dd>
              </div>
              <div className="flex justify-between gap-2 py-1">
                <dt className="text-muted">Shoot</dt>
                <dd className="truncate text-end font-medium text-ink">{shoot(project)}</dd>
              </div>
            </dl>
          )}
        </div>
      </Link>
      {/* A sibling of the card's link (not inside it), floating over the cover's corner. */}
      <CopyLinkButton url={project.share_url} className="absolute end-3.5 top-3.5" />
    </li>
  );
}

/** Round link icon that copies the client's gallery link; a check for a moment after. */
function CopyLinkButton({ url, className }: { url: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await writeClipboard(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      aria-label={copied ? "Client link copied" : "Copy client link"}
      title={copied ? "Copied" : "Copy client link"}
      className={cn(
        "flex size-8 items-center justify-center rounded-full bg-surface/90 text-ink shadow-sm backdrop-blur-sm transition-colors hover:bg-surface hover:text-accent",
        className,
      )}
    >
      {copied ? <Check className="size-4 text-positive" strokeWidth={2.5} /> : <Link2 className="size-4" />}
    </button>
  );
}

const TABLE_COLUMNS = "md:grid-cols-[56px_minmax(0,1.6fr)_minmax(0,1fr)_140px_76px_120px_96px_100px_104px]";

function ProjectTable({ projects, sort, onSort }: { projects: ProjectSummary[]; sort: SortState; onSort: (next: SortState) => void }) {
  const head = (label: string, column: string, firstDirection: SortState["direction"] = "asc") => (
    <SortHeader label={label} column={column} state={sort} onSort={onSort} firstDirection={firstDirection} />
  );
  return (
    <div>
      <div className={cn(TABLE_HEAD, TABLE_COLUMNS)}>
        <span />
        {head("Project", "title")}
        {head("Client", "client")}
        {head("Shoot", "shoot_date", "desc")}
        {head("Frames", "photos_count", "desc")}
        {head("Status", "status")}
        {head("Payment", "paid_percent", "desc")}
        {head("Last sync", "last_synced_at", "desc")}
        <span>Actions</span>
      </div>
      <ul className="divide-y divide-rule">
        {projects.map((project) => (
          <li
            key={project.id}
            className={cn("group relative grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-4 px-5 py-2.5 transition-colors hover:bg-raised md:gap-5", TABLE_COLUMNS)}
          >
            <Cover project={project} className="aspect-[4/3] w-14 rounded-[8px]" small />
            <div className="min-w-0">
              {/* The title's link covers the whole row; the actions sit above it. */}
              <Link href={`/projects/${project.id}`} className="block truncate text-[13px] font-semibold text-ink after:absolute after:inset-0 after:content-['']">
                {project.title}
              </Link>
              <p className="truncate text-xs text-muted md:hidden">
                {project.client_name ?? "No client"} · {number(project.photos_count)} frames
              </p>
              {project.category && <p className="hidden truncate text-xs text-muted md:block">{project.category}</p>}
              <span className="mt-1.5 inline-flex gap-1 md:hidden">
                <StatusTag project={project} />
                <PaymentBadge percent={project.paid_percent} />
              </span>
            </div>
            <span className="hidden truncate text-[13px] text-ink md:block">{project.client_name ?? "—"}</span>
            <span className="hidden text-xs text-muted md:block">{shoot(project)}</span>
            <span className="hidden md:block">
              <span className="inline-block rounded-[8px] bg-raised px-2 py-0.5 font-mono text-xs text-ink tabular group-hover:bg-active">{number(project.photos_count)}</span>
            </span>
            <span className="hidden md:block">
              <StatusTag project={project} />
            </span>
            <span className="hidden md:block">
              <PaymentBadge percent={project.paid_percent} bar />
            </span>
            <span className="hidden text-xs text-muted md:block">
              {!project.has_photos_folder ? "No folder" : project.last_synced_at ? relative(project.last_synced_at) : "Syncing…"}
            </span>
            <span className="flex items-center gap-0.5">
              <RowAction label="Preview gallery" href={project.share_url}>
                <ExternalLink className="size-4" />
              </RowAction>
              <CopyRowAction label="Copy client link" text={project.share_url}>
                <Link2 className="size-4" />
              </CopyRowAction>
              <Link
                href={`/projects/${project.id}`}
                aria-label={`Open ${project.title}`}
                title="Open project"
                className="relative z-10 hidden size-8 items-center justify-center rounded-[8px] text-muted transition-colors hover:bg-active hover:text-ink md:flex"
              >
                <ArrowUpRight className="size-4" />
              </Link>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** "13–24 of 40" on the left, square previous/next on the right, like the Overview's scroll buttons. */
export function Pager({ meta, onPage }: { meta: Paginated; onPage: (page: number) => void }) {
  if (meta.last_page <= 1) return null;
  const button = "flex size-9 items-center justify-center rounded-[10px] border border-line bg-surface text-muted transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-40";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 border-t border-rule px-5 py-3">
      <p className="font-mono text-xs text-muted tabular">
        {number(meta.from ?? 0)}–{number(meta.to ?? 0)} of {number(meta.total)}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className={button} disabled={meta.current_page <= 1} onClick={() => onPage(meta.current_page - 1)} aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-14 rounded-[8px] bg-raised px-2.5 py-1 text-center font-mono text-xs text-ink tabular" aria-current="page">
          {meta.current_page} / {meta.last_page}
        </span>
        <button type="button" className={button} disabled={meta.current_page >= meta.last_page} onClick={() => onPage(meta.current_page + 1)} aria-label="Next page">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </nav>
  );
}

export function CardsSkeleton() {
  return (
    <div className={CARD_GRID}>
      {Array.from({ length: 12 }, (_, index) => (
        <div key={index} className="rounded-[14px] border border-rule p-2">
          <Skeleton className="aspect-[4/3] w-full rounded-[10px]" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <Skeleton className="mt-2 h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}
