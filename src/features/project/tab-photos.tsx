"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Heart, ImageIcon, LayoutGrid, MessageSquare, RefreshCw, RectangleHorizontal, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadError } from "@/components/ui/notice";
import { Pagination } from "@/components/ui/pagination";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/spinner";
import { api, query } from "@/lib/api";
import { cn } from "@/lib/cn";
import { count, number, plural, relative } from "@/lib/format";
import type { Comment, PhotoTab, ProjectDetail, SelectionsTab } from "@/lib/types";
import { useQueryState } from "@/lib/use-query-state";
import { frame, PhotoViewer } from "./photo-viewer";
import { projectKey } from "./use-project";

type Filter = PhotoTab["filter"];
type View = "grid" | "viewer";

const PER_PAGE = 48;

export function PhotosTab({ project }: { project: ProjectDetail }) {
  const url = useQueryState();
  const client = useQueryClient();
  const filter = (["all", "selected", "commented"].includes(url.get("filter")) ? url.get("filter") : "all") as Filter;
  const view: View = url.get("view") === "viewer" ? "viewer" : "grid";
  const page = Number(url.get("page", "1")) || 1;
  const photoParam = Number(url.get("photo")) || null;
  const [syncing, setSyncing] = useState(false);
  // Which end of the next page to land on when the viewer steps past a page edge.
  const edge = useRef<"first" | "last" | null>(null);

  const photos = useQuery({
    queryKey: [...projectKey(project.id), "photos", { filter, page }],
    queryFn: () => api.get<PhotoTab>(`/projects/${project.id}/photos${query({ filter: filter === "all" ? null : filter, page: page > 1 ? page : null })}`),
    placeholderData: keepPreviousData,
    refetchInterval: (q) => (q.state.data?.should_poll ? 5_000 : false),
  });

  // Comments for the viewer's side panel come with the selections.
  const selections = useQuery({
    queryKey: [...projectKey(project.id), "selections"],
    queryFn: () => api.get<SelectionsTab>(`/projects/${project.id}/selections`),
    enabled: view === "viewer",
  });

  const comments = useMemo(() => {
    const map = new Map<number, Comment[]>();
    for (const item of selections.data?.selections ?? []) if (item.comments.length) map.set(item.photo.id, item.comments);
    for (const group of selections.data?.other_comments ?? []) map.set(group.photo.id, group.comments);
    return map;
  }, [selections.data]);

  const list = photos.data && !photos.isPlaceholderData ? photos.data.data : null;
  const index = list ? Math.max(0, list.findIndex((photo) => photo.id === photoParam)) : 0;

  // After a page turn in the viewer, select the frame at the edge we came from.
  useEffect(() => {
    if (!list || list.length === 0 || view !== "viewer") return;
    if (!list.some((photo) => photo.id === photoParam)) {
      const target = edge.current === "last" ? list[list.length - 1] : list[0];
      edge.current = null;
      url.set({ photo: target.id });
    }
  }, [list, photoParam, view]);

  async function sync() {
    setSyncing(true);
    await api.post(`/projects/${project.id}/sync`, { kind: "proof" }).finally(() => setSyncing(false));
    client.invalidateQueries({ queryKey: projectKey(project.id) });
  }

  const setView = (next: View, photoId?: number) => url.set({ view: next, photo: photoId ?? null }, { defaults: { view: "grid" } });

  if (photos.isPending) return <GridSkeleton />;
  if (photos.isError) return <LoadError what="photos" onRetry={() => photos.refetch()} />;

  const data = photos.data;
  const isSyncing = data.syncing || syncing;
  const offset = (data.meta.current_page - 1) * PER_PAGE;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<Filter>
            label="Filter photos"
            value={filter}
            onChange={(value) => url.set({ filter: value, page: null, photo: null }, { defaults: { filter: "all" } })}
            options={[
              { value: "all", label: "All", count: data.counts.all },
              { value: "selected", label: "Client picks", count: data.counts.selected },
              { value: "commented", label: "Commented", count: data.counts.commented },
            ]}
          />
          <div role="radiogroup" aria-label="Preview mode" className="inline-flex gap-0.5 rounded-control bg-raised p-0.5">
            {(
              [
                ["grid", "Grid", LayoutGrid],
                ["viewer", "Viewer", RectangleHorizontal],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={view === value}
                onClick={() => setView(value, value === "viewer" ? (photoParam ?? data.data[0]?.id) : undefined)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-[6px] px-3 text-[13px] font-medium transition-colors",
                  view === value ? "bg-surface text-ink shadow-[0_0_0_1px_var(--line)]" : "text-muted hover:text-ink",
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[13px] text-muted">
            {data.syncing ? "Syncing with Google Drive…" : data.last_synced_at ? `Synced ${relative(data.last_synced_at)}` : "Not synced yet"}
            {!data.syncing && data.pending > 0 && ` · caching ${number(data.pending)} ${plural(data.pending, "preview")}`}
          </span>
          <Button size="sm" onClick={sync} disabled={isSyncing} icon={<RefreshCw className={cn("size-3.5", isSyncing && "animate-spin")} />}>
            {isSyncing ? "Syncing…" : "Sync from Drive"}
          </Button>
        </div>
      </div>

      {data.data.length === 0 ? (
        filter !== "all" ? (
          <EmptyState title="No photos match this filter">
            {filter === "selected" ? "The client hasn't picked any photos yet." : "No comments have been left yet."}
          </EmptyState>
        ) : (
          <EmptyState title={data.syncing ? "Importing photos…" : "No photos yet"}>
            {data.syncing ? "Photos appear here as they're fetched from Google Drive." : "Upload photos to the Drive folder, then sync."}
          </EmptyState>
        )
      ) : view === "viewer" ? (
        <div className="space-y-3">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setView("grid")}
            className="inline-flex h-8 items-center gap-1 rounded-[8px] bg-accent px-3 text-xs font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            <ChevronLeft className="size-3.5" /> Back to grid
          </button>
        </div>
        <PhotoViewer
          photos={data.data}
          index={index}
          onIndex={(next) => url.set({ photo: data.data[next].id })}
          offset={offset}
          total={data.meta.total}
          canPrev={index > 0 || data.meta.current_page > 1}
          canNext={index < data.data.length - 1 || data.meta.current_page < data.meta.last_page}
          onPrev={() => {
            if (data.meta.current_page <= 1) return;
            edge.current = "last";
            url.set({ page: data.meta.current_page - 1 > 1 ? data.meta.current_page - 1 : null, photo: null });
          }}
          onNext={() => {
            if (data.meta.current_page >= data.meta.last_page) return;
            edge.current = "first";
            url.set({ page: data.meta.current_page + 1, photo: null });
          }}
          comments={comments}
        />
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8">
            {data.data.map((photo, photoIndex) => (
              <li key={photo.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => setView("viewer", photo.id)}
                  className={cn(
                    "group relative block aspect-square w-full overflow-hidden bg-raised",
                    photo.is_selected && "outline-2 outline-offset-2 outline-accent",
                  )}
                  title={`Open ${photo.filename} in the viewer`}
                >
                  {photo.thumbnail_url ? (
                    <img
                      src={`${photo.thumbnail_url}?size=grid`}
                      alt={photo.filename}
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center text-faint">
                      <ImageIcon className="size-5 animate-pulse" />
                    </span>
                  )}
                  <span className="absolute inset-x-2 top-2 flex items-start justify-between gap-2">
                    {photo.is_selected ? (
                      <span className="flex size-6 items-center justify-center rounded-full bg-accent text-white" title="Picked by client">
                        <Heart className="size-3" fill="currentColor" />
                        <span className="sr-only">Picked by client</span>
                      </span>
                    ) : (
                      <span />
                    )}
                    {photo.is_cover && (
                      <span className="inline-flex items-center gap-1 rounded-chip bg-surface px-1.5 py-0.5 text-[11px] font-medium text-ink">
                        <Star className="size-3" /> Cover
                      </span>
                    )}
                  </span>
                  {photo.comments_count > 0 && (
                    <span
                      className="absolute bottom-2 end-2 inline-flex items-center gap-1 rounded-chip bg-surface px-1.5 py-0.5 font-mono text-[11px] text-ink"
                      title={count(photo.comments_count, "comment")}
                    >
                      <MessageSquare className="size-3" />
                      {photo.comments_count}
                    </span>
                  )}
                </button>
                <p className="mt-1.5 flex items-baseline gap-2 font-mono text-[11px] text-muted">
                  <span className="text-faint">{frame(offset + photoIndex + 1, data.meta.total)}</span>
                  <span className="truncate" title={photo.filename}>
                    {photo.filename}
                  </span>
                </p>
              </li>
            ))}
          </ul>
          <Pagination meta={data.meta} noun="photos" onPage={(next) => url.set({ page: next > 1 ? next : null })} />
        </>
      )}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8">
      {Array.from({ length: 16 }, (_, index) => (
        <Skeleton key={index} className="aspect-square w-full" />
      ))}
    </div>
  );
}
