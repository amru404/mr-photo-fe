"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, FolderPlus, Heart, ImageIcon, LayoutGrid, MessageSquare, RefreshCw, RectangleHorizontal, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadError } from "@/components/ui/notice";
import { Pagination } from "@/components/ui/pagination";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/feedback";
import { api, ApiError, query } from "@/lib/api";
import { cn } from "@/lib/cn";
import { count, longDate, number, plural, relative } from "@/lib/format";
import type { Comment, PhotoTab, ProjectDetail, SelectionsTab } from "@/lib/types";
import { useQueryState } from "@/lib/use-query-state";
import { frame, PhotoViewer } from "./photo-viewer";
import { TabToolbar } from "./toolbar-slot";
import { FolderLinkField, FolderSkeleton, ShareWithNotice } from "@/features/projects/drive-folder";
import { useOptions } from "@/features/projects/use-options";
import { projectKey, useSetProject } from "./use-project";

type Filter = PhotoTab["filter"];
type View = "grid" | "viewer";

const PER_PAGE = 48;

/** A booking without a Drive folder gets the connect panel instead of a grid (and no Sync). */
export function PhotosTab({ project }: { project: ProjectDetail }) {
  return project.has_photos_folder ? <PhotoGrid project={project} /> : <ConnectFolderPanel project={project} />;
}

function ConnectFolderPanel({ project }: { project: ProjectDetail }) {
  const client = useQueryClient();
  const options = useOptions();
  const setProject = useSetProject(project.id);
  const toast = useToast();
  const [link, setLink] = useState("");
  const [error, setError] = useState<string>();
  const [connecting, setConnecting] = useState(false);

  async function connect() {
    setConnecting(true);
    setError(undefined);
    try {
      const result = await api.post<{ project: ProjectDetail }>(`/projects/${project.id}/drive-folder`, { drive_folder_link: link });
      setProject(result.project);
      client.invalidateQueries({ queryKey: projectKey(project.id) });
      client.invalidateQueries({ queryKey: ["projects"] });
      client.invalidateQueries({ queryKey: ["overview"] });
      client.invalidateQueries({ queryKey: ["schedule"] });
      toast("Drive folder connected. Importing photos…");
    } catch (failure) {
      setError(failure instanceof ApiError ? (failure.field("drive_folder_link") ?? failure.message) : "Couldn't connect the folder.");
    } finally {
      setConnecting(false);
    }
  }

  return (
    <section className="grid gap-5 rounded-card border border-line bg-surface p-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-10 lg:p-6">
      <div>
        <span className="flex size-10 items-center justify-center rounded-control bg-raised text-muted">
          <FolderPlus className="size-5" strokeWidth={1.75} />
        </span>
        <h2 className="deck-title mt-4">Connect Drive folder</h2>
        <p className="mt-1.5 text-[13px] text-muted">
          This project is booked{project.shoot_date ? ` for ${longDate(project.shoot_date)}` : ""} without photos. Once the shoot is uploaded to Google Drive, connect the folder and
          the photos are imported here for your client to pick from.
        </p>
      </div>
      <div className="min-w-0">
        <ShareWithNotice email={options.data?.service_account_email} />
        <div className="mt-5">
          <FolderLinkField value={link} onChange={setLink} onConnect={connect} connecting={connecting} error={error} />
        </div>
        {connecting && <FolderSkeleton />}
      </div>
    </section>
  );
}

function PhotoGrid({ project }: { project: ProjectDetail }) {
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

  // Double-clicking a grid tile shows that photo alone, fullscreen; ← → step through the page.
  const screen = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState<number | null>(null);
  const pagePhotos = photos.data?.data;

  function openFull(photoIndex: number) {
    setFull(photoIndex);
    screen.current?.requestFullscreen?.();
  }

  useEffect(() => {
    const sync = () => {
      if (document.fullscreenElement !== screen.current) setFull(null);
    };
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  useEffect(() => {
    if (full === null || !pagePhotos) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") setFull((i) => (i === null ? i : Math.max(0, i - 1)));
      else if (event.key === "ArrowRight") setFull((i) => (i === null ? i : Math.min(pagePhotos.length - 1, i + 1)));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full, pagePhotos]);

  const fullPhoto = full !== null ? pagePhotos?.[full] : undefined;

  const setView = (next: View, photoId?: number) => url.set({ view: next, photo: photoId ?? null }, { defaults: { view: "grid" } });

  if (photos.isPending) return <GridSkeleton />;
  if (photos.isError) return <LoadError what="photos" onRetry={() => photos.refetch()} />;

  const data = photos.data;
  const isSyncing = data.syncing || syncing;
  const offset = (data.meta.current_page - 1) * PER_PAGE;

  return (
    <div className="space-y-5">
      <TabToolbar>
          <Segmented<Filter>
            variant="chips"
            label="Filter photos"
            value={filter}
            onChange={(value) => url.set({ filter: value, page: null, photo: null }, { defaults: { filter: "all" } })}
            options={[
              { value: "all", label: "All", count: data.counts.all },
              { value: "selected", label: "Client picks", count: data.counts.selected },
              { value: "commented", label: "Commented", count: data.counts.commented },
            ]}
          />
          <div role="radiogroup" aria-label="Preview mode" className="inline-flex items-center gap-1 rounded-[12px] border border-line bg-surface p-1">
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
                  "inline-flex h-8 items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-semibold transition-colors",
                  view === value ? "bg-ink text-ground" : "text-muted hover:bg-raised hover:text-ink",
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>

        <div className="ms-auto flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted">
            {data.syncing ? "Syncing with Google Drive…" : data.last_synced_at ? `Synced ${relative(data.last_synced_at)}` : "Not synced yet"}
            {!data.syncing && data.pending > 0 && ` · caching ${number(data.pending)} ${plural(data.pending, "preview")}`}
          </span>
          <Button size="sm" onClick={sync} disabled={isSyncing} icon={<RefreshCw className={cn("size-3.5", isSyncing && "animate-spin")} />}>
            {isSyncing ? "Syncing…" : "Sync from Drive"}
          </Button>
        </div>
      </TabToolbar>

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
            className="inline-flex h-8 items-center gap-1 rounded-[8px] bg-accent px-3 text-xs font-semibold text-on-accent transition-colors hover:bg-accent-hover"
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
          {/* The contact sheet in a deck, like the Client picks tab: title, count, then the cards. */}
          <section className="overflow-hidden rounded-card border border-line bg-surface">
            <header className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
              <h3 className="deck-title">{filter === "selected" ? "Client picks" : filter === "commented" ? "Commented" : "All photos"}</h3>
              <span className="min-w-8 rounded-[8px] bg-raised px-2 py-0.5 text-center font-mono text-xs text-ink tabular">{number(data.meta.total)}</span>
            </header>
            <ul className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
              {data.data.map((photo, photoIndex) => (
                <li
                  key={photo.id}
                  className={cn(
                    "min-w-0 rounded-card border bg-surface p-1.5 transition-colors",
                    photo.is_selected ? "border-accent" : "border-line hover:border-control",
                  )}
                >
                  <button
                    type="button"
                    onDoubleClick={() => openFull(photoIndex)}
                    onKeyDown={(event) => event.key === "Enter" && openFull(photoIndex)}
                    className="group relative block aspect-square w-full overflow-hidden rounded-[10px] bg-raised"
                    title={`Double-click to view ${photo.filename} fullscreen`}
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
                    {/* Frame number top left, the client's pick top right; cover and comments along the bottom. */}
                    <span className="absolute inset-x-2 top-2 flex items-start justify-between gap-2">
                      <span className="rounded-[6px] bg-surface/90 px-1.5 py-0.5 font-mono text-[11px] font-medium text-ink shadow-sm">
                        {frame(offset + photoIndex + 1, data.meta.total)}
                      </span>
                      {photo.is_selected && (
                        <span className="flex size-6 items-center justify-center rounded-full bg-love text-white shadow-sm" title="Picked by client">
                          <Heart className="size-3" fill="currentColor" />
                          <span className="sr-only">Picked by client</span>
                        </span>
                      )}
                    </span>
                    {(photo.is_cover || photo.comments_count > 0) && (
                      <span className="absolute inset-x-2 bottom-2 flex items-end justify-between gap-2">
                        {photo.is_cover ? (
                          <span className="inline-flex items-center gap-1 rounded-[6px] bg-surface/90 px-1.5 py-0.5 text-[11px] font-medium text-ink shadow-sm">
                            <Star className="size-3" /> Cover
                          </span>
                        ) : (
                          <span />
                        )}
                        {photo.comments_count > 0 && (
                          <span
                            className="inline-flex items-center gap-1 rounded-[6px] bg-surface/90 px-1.5 py-0.5 font-mono text-[11px] text-ink shadow-sm"
                            title={count(photo.comments_count, "comment")}
                          >
                            <MessageSquare className="size-3 text-accent" />
                            {photo.comments_count}
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                  <p className="truncate px-1 pb-0.5 pt-1.5 text-xs font-medium text-ink" title={photo.filename}>
                    {photo.filename}
                  </p>
                </li>
              ))}
            </ul>
            <div className="px-4 pb-4 empty:hidden">
              <Pagination meta={data.meta} noun="photos" onPage={(next) => url.set({ page: next > 1 ? next : null })} />
            </div>
          </section>
          <div ref={screen} className="hidden items-center justify-center bg-black [&:fullscreen]:flex">
            {fullPhoto &&
              (fullPhoto.thumbnail_url ? (
                <img key={fullPhoto.id} src={fullPhoto.thumbnail_url} alt={fullPhoto.filename} className="max-h-full max-w-full select-none object-contain" draggable={false} />
              ) : (
                <p className="text-sm text-white/60">Preview is still being cached</p>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-card border border-line bg-surface p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
      {Array.from({ length: 16 }, (_, index) => (
        <div key={index} className="rounded-card border border-line bg-surface p-1.5">
          <Skeleton className="aspect-square w-full rounded-[10px]" />
          <Skeleton className="mx-1 mb-0.5 mt-2 h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}
