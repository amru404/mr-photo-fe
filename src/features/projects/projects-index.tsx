"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ImageOff, LayoutGrid, List, Plus, Search } from "lucide-react";
import { PageBody, PageHeader } from "@/components/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { EmptyState, LoadError, Notice } from "@/components/ui/notice";
import { Meter } from "@/components/ui/meter";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/pill";
import { Skeleton, Spinner } from "@/components/ui/spinner";
import { api, query } from "@/lib/api";
import { cn } from "@/lib/cn";
import { flash } from "@/lib/flash";
import { longDate, number, relative } from "@/lib/format";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/labels";
import type { ProjectList, ProjectSummary } from "@/lib/types";
import { useQueryState } from "@/lib/use-query-state";
import { useTitle } from "@/lib/use-title";

type Layout = "cards" | "table";

export function ProjectsIndex() {
  useTitle("Projects");
  const url = useQueryState();
  const status = url.get("status");
  const layout: Layout = url.get("layout") === "table" ? "table" : "cards";
  const page = Number(url.get("page", "1")) || 1;
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
    queryKey: ["projects", { search: debounced, status, page }],
    queryFn: () => api.get<ProjectList>(`/projects${query({ search: debounced, status, page: page > 1 ? page : null })}`),
    placeholderData: keepPreviousData,
    refetchInterval: (q) => (q.state.data?.is_syncing ? 5_000 : false),
    notifyOnChangeProps: ["data", "error"],
  });

  const filtering = debounced !== "" || status !== "";
  const tabs = [{ value: "", label: "All", count: list.data?.total_count }, ...STATUS_ORDER.map((value) => ({ value, label: STATUS_LABELS[value], count: list.data?.status_counts[value] }))];

  return (
    <PageBody>
      <PageHeader
        eyebrow={list.data ? `${number(list.data.total_count)} galleries` : " "}
        title="Projects"
        description="Every client gallery, from first share to final delivery."
        actions={
          <ButtonLink href="/projects/new" variant="primary" icon={<Plus className="size-4" />}>
            New project
          </ButtonLink>
        }
      />

      {created && (
        <Notice tone="success" className="mt-6">
          {created}
        </Notice>
      )}

      <div className="mt-8 flex flex-col gap-3 border-b border-line lg:flex-row lg:items-end lg:justify-between">
        <nav aria-label="Filter by status" className="no-scrollbar -mb-px flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const active = tab.value === status;
            return (
              <button
                key={tab.value || "all"}
                type="button"
                aria-pressed={active}
                onClick={() => url.set({ status: tab.value, page: null })}
                className={cn(
                  "relative inline-flex h-10 items-center gap-1.5 whitespace-nowrap px-3 text-sm transition-colors",
                  active ? "font-medium text-ink" : "text-muted hover:text-ink",
                )}
              >
                {tab.label}
                {tab.count !== undefined && <span className={cn("font-mono text-xs", active ? "text-accent" : "text-faint")}>{tab.count}</span>}
                {active && <span aria-hidden="true" className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" />}
              </button>
            );
          })}
        </nav>
        <div className="flex items-center gap-2 pb-2">
          <div className="relative w-full lg:w-72">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, client or email"
              aria-label="Search projects"
              className="h-9 ps-9"
            />
          </div>
          <div role="radiogroup" aria-label="Layout" className="inline-flex shrink-0 gap-0.5 rounded-control bg-raised p-0.5">
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
                  "flex size-8 items-center justify-center rounded-[6px] transition-colors",
                  layout === value ? "bg-surface text-ink shadow-[0_0_0_1px_var(--line)]" : "text-muted hover:text-ink",
                )}
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        {list.isPending ? (
          <CardsSkeleton />
        ) : list.isError ? (
          <LoadError what="your projects" onRetry={() => list.refetch()} />
        ) : list.data.data.length === 0 ? (
          filtering ? (
            <EmptyState title="No projects match">Try a different search or status.</EmptyState>
          ) : (
            <EmptyState
              title="No projects yet"
              action={
                <ButtonLink href="/projects/new" variant="primary">
                  New project
                </ButtonLink>
              }
            >
              Connect a Google Drive folder to create your first client gallery.
            </EmptyState>
          )
        ) : (
          <div className="space-y-6">
            {layout === "cards" ? (
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {list.data.data.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </ul>
            ) : (
              <ProjectTable projects={list.data.data} />
            )}
            <Pagination meta={list.data.meta} noun="projects" onPage={(next) => url.set({ page: next > 1 ? next : null })} />
          </div>
        )}
      </div>
    </PageBody>
  );
}

function syncState(project: ProjectSummary) {
  const synced = project.last_synced_at !== null;
  return {
    synced,
    caching: synced && project.photos_count > 0 && project.cached_photos_count < project.photos_count,
    waiting: !synced || project.photos_count > 0,
  };
}

function Cover({ project, className, small }: { project: ProjectSummary; className?: string; small?: boolean }) {
  const { waiting } = syncState(project);
  return (
    <div className={cn("overflow-hidden bg-raised", className)}>
      {project.cover_url ? (
        <img src={small ? `${project.cover_url}?size=grid` : project.cover_url} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      ) : (
        <div className="flex size-full items-center justify-center text-faint" title={waiting ? "Syncing photos…" : "No photos in folder"}>
          {waiting ? <Spinner className="size-4" /> : <ImageOff className="size-5" strokeWidth={1.5} />}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectSummary }) {
  const { caching, synced } = syncState(project);
  return (
    <li>
      <Link href={`/projects/${project.id}`} className="group block overflow-hidden rounded-card border border-line bg-surface transition-colors hover:border-control">
        <div className="relative">
          <Cover project={project} className="aspect-[3/2] w-full" />
          <StatusBadge status={project.status} className="absolute start-3 top-3" />
        </div>
        <div className="p-4">
          <p className="truncate text-[15px] font-semibold text-ink">{project.title}</p>
          <p className="mt-0.5 truncate text-[13px] text-muted">
            {project.client_name ?? "No client"}
            {project.category && ` · ${project.category}`}
          </p>
          {caching ? (
            <div className="mt-4">
              <div className="flex justify-between font-mono text-[11px] text-muted tabular">
                <span>Caching previews</span>
                <span>
                  {number(project.cached_photos_count)}/{number(project.photos_count)}
                </span>
              </div>
              <Meter value={project.cached_photos_count} max={project.photos_count} className="mt-1" label="Previews cached" />
            </div>
          ) : (
            <div className="mt-4 flex items-center justify-between border-t border-rule pt-3 font-mono text-[11px] text-muted tabular">
              <span>{synced ? `${number(project.photos_count)} frames` : "Syncing…"}</span>
              <span>{project.shoot_date ? longDate(project.shoot_date) : "No shoot date"}</span>
            </div>
          )}
        </div>
      </Link>
    </li>
  );
}

function ProjectTable({ projects }: { projects: ProjectSummary[] }) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="hidden grid-cols-[64px_minmax(0,1.6fr)_minmax(0,1fr)_120px_100px_150px_120px] gap-5 border-b border-line bg-ground px-4 py-2.5 text-xs text-muted md:grid">
        <span />
        <span>Project</span>
        <span>Client</span>
        <span>Shoot date</span>
        <span className="text-end">Frames</span>
        <span>Status</span>
        <span className="text-end">Last sync</span>
      </div>
      <ul className="divide-y divide-rule">
        {projects.map((project) => (
          <li key={project.id}>
            <Link
              href={`/projects/${project.id}`}
              className="group grid grid-cols-[64px_minmax(0,1fr)] items-center gap-4 px-4 py-2.5 transition-colors hover:bg-ground md:grid-cols-[64px_minmax(0,1.6fr)_minmax(0,1fr)_120px_100px_150px_120px] md:gap-5"
            >
              <Cover project={project} className="aspect-[4/3] w-16 rounded-chip" small />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{project.title}</p>
                <p className="truncate text-xs text-muted md:hidden">
                  {project.client_name ?? "No client"} · {number(project.photos_count)} frames
                </p>
                {project.category && <p className="hidden truncate text-xs text-muted md:block">{project.category}</p>}
                <StatusBadge status={project.status} className="mt-1.5 md:hidden" />
              </div>
              <span className="hidden truncate text-sm text-ink md:block">{project.client_name ?? "—"}</span>
              <span className="hidden font-mono text-xs text-muted md:block">{project.shoot_date ? longDate(project.shoot_date) : "—"}</span>
              <span className="hidden text-end font-mono text-sm tabular md:block">{number(project.photos_count)}</span>
              <span className="hidden md:block">
                <StatusBadge status={project.status} />
              </span>
              <span className="hidden text-end text-xs text-muted md:block">{project.last_synced_at ? relative(project.last_synced_at) : "Syncing…"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-card border border-line bg-surface">
          <Skeleton className="aspect-[3/2] w-full rounded-none" />
          <div className="p-4">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-2 h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
