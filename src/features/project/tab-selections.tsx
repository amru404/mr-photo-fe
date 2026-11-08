"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CircleCheck, Clock, Download, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { useConfirm } from "@/components/ui/feedback";
import { EmptyState, LoadError, Notice } from "@/components/ui/notice";
import { Meter } from "@/components/ui/meter";
import { StatusBadge } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { count, dateTime, number, relative } from "@/lib/format";
import type { Comment, PhotoRef, ProjectDetail, SelectionsTab as Selections } from "@/lib/types";
import { CommentList } from "./comment-list";
import { frame, type ViewerPhoto } from "./photo-viewer";
import { projectKey } from "./use-project";
import { ViewerOverlay } from "./viewer-overlay";

export function SelectionsTab({ project }: { project: ProjectDetail }) {
  const client = useQueryClient();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [open, setOpen] = useState<{ list: "picks" | "comments"; index: number } | null>(null);

  const selections = useQuery({
    queryKey: [...projectKey(project.id), "selections"],
    queryFn: () => api.get<Selections>(`/projects/${project.id}/selections`),
  });

  const lists = useMemo(() => {
    const data = selections.data;
    const comments = new Map<number, Comment[]>();
    if (!data) return { picks: [] as ViewerPhoto[], commented: [] as ViewerPhoto[], comments };
    for (const item of data.selections) if (item.comments.length) comments.set(item.photo.id, item.comments);
    for (const group of data.other_comments) comments.set(group.photo.id, group.comments);
    return {
      picks: data.selections.map((item) => ({ ...item.photo, is_selected: true, comments_count: item.comments.length })),
      commented: [
        ...data.selections.filter((item) => item.comments.length).map((item) => ({ ...item.photo, is_selected: true, comments_count: item.comments.length })),
        ...data.other_comments.map((group) => ({ ...group.photo, is_selected: false, comments_count: group.comments.length })),
      ],
      comments,
    };
  }, [selections.data]);

  async function markEditing() {
    const ok = await confirm({
      title: "Move to Editing?",
      message: project.selection_submitted_at
        ? "The client's picks are locked in and the project moves to Editing."
        : "The client hasn't submitted their selection yet. Move to Editing anyway?",
      confirmLabel: "Move to Editing",
    });
    if (!ok) return;

    setBusy(true);
    try {
      const result = await api.post<{ message: string }>(`/projects/${project.id}/editing`);
      setMessage({ tone: "success", text: result.message });
      client.invalidateQueries({ queryKey: projectKey(project.id) });
      client.invalidateQueries({ queryKey: ["overview"] });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof ApiError ? (error.field("status") ?? error.message) : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  if (selections.isPending) return <Skeleton className="h-64 w-full rounded-card" />;
  if (selections.isError) return <LoadError what="client picks" onRetry={() => selections.refetch()} />;

  const data = selections.data;
  const picked = data.selections.length;
  const max = project.max_selectable_photos;
  const totalComments = [...lists.comments.values()].reduce((sum, list) => sum + list.length, 0);

  return (
    <div className="space-y-6">
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      {/* Summary */}
      <section className="grid gap-px overflow-hidden rounded-card border border-line bg-line lg:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))]">
        <div className="flex items-start gap-3 bg-surface p-5">
          {project.selection_submitted_at ? (
            <CircleCheck className="mt-0.5 size-5 shrink-0 text-positive" aria-hidden="true" />
          ) : (
            <Clock className="mt-0.5 size-5 shrink-0 text-status-selection" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <h2 className="text-section font-semibold">{project.selection_submitted_at ? "Selection submitted" : "Client is still picking"}</h2>
            <p className="mt-0.5 text-sm text-muted">
              {project.selection_submitted_at
                ? `${project.client_name ?? "The client"} sent ${count(picked, "photo")} on ${dateTime(project.selection_submitted_at)}.`
                : picked === 0
                  ? "No photos picked yet. Picks appear here live."
                  : `${count(picked, "photo")} picked so far; this can still change.`}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {project.can_move_to_editing ? (
                <Button variant="primary" size="sm" loading={busy} onClick={markEditing}>
                  Move to Editing
                  <ArrowRight className="size-3.5" />
                </Button>
              ) : (
                <StatusBadge status={project.status} />
              )}
            </div>
          </div>
        </div>

        <div className="bg-surface p-5">
          <p className="text-[13px] text-muted">Picked</p>
          <p className="mt-1 font-mono text-figure font-medium tabular">
            {number(picked)}
            <span className="text-base text-faint"> / {max ?? number(project.counts.photos)}</span>
          </p>
          <Meter className="mt-3" value={picked} max={max ?? Math.max(project.counts.photos, 1)} label="Photos picked" />
          <p className="mt-2 text-xs text-faint">{max ? `limit of ${max}` : "no limit set"}</p>
        </div>

        <div className="bg-surface p-5">
          <p className="text-[13px] text-muted">Hand-off</p>
          <div className="mt-2 flex flex-col gap-2">
            {/* Comma-separated filenames, e.g. to paste into a Lightroom filter. */}
            <CopyButton
              size="sm"
              text={data.selections.map((selection) => selection.photo.filename).join(",\n")}
              title="Copy every picked filename, comma-separated, for a Lightroom filter"
              copiedLabel="Filenames copied"
              className="w-full"
            >
              Copy filenames
            </CopyButton>
            <a
              href={`/api/projects/${project.id}/selections.csv`}
              aria-disabled={picked === 0}
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-control border border-control bg-surface px-3 text-[13px] font-medium text-ink transition-colors hover:bg-raised aria-disabled:pointer-events-none aria-disabled:opacity-50"
            >
              <Download className="size-3.5" />
              Export CSV
            </a>
          </div>
        </div>
      </section>

      {picked === 0 && data.other_comments.length === 0 ? (
        <EmptyState title="Nothing here yet">
          Copy the client link from the top of the page and send it. Picks and comments show up here as the client works.
        </EmptyState>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          {/* Contact sheet of picks */}
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-section font-semibold">Picks</h3>
              <span className="font-mono text-xs text-faint">{picked}</span>
            </div>
            {picked === 0 ? (
              <p className="rounded-card border border-dashed border-control px-5 py-8 text-center text-sm text-muted">No picks yet.</p>
            ) : (
              <ol className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
                {data.selections.map((selection, index) => (
                  <li key={selection.id} className="min-w-0">
                    <button
                      type="button"
                      onClick={() => setOpen({ list: "picks", index })}
                      className="group relative block aspect-square w-full overflow-hidden bg-raised"
                    >
                      <Thumb photo={selection.photo} className="size-full transition-transform duration-300 group-hover:scale-[1.04]" />
                      <span className="absolute start-1.5 top-1.5 rounded-chip bg-surface px-1.5 font-mono text-[11px] font-medium text-ink">
                        {frame(index + 1, picked)}
                      </span>
                      {selection.comments.length > 0 && (
                        <span className="absolute bottom-1.5 end-1.5 inline-flex items-center gap-1 rounded-chip bg-accent px-1.5 font-mono text-[11px] text-white">
                          <MessageSquare className="size-3" />
                          {selection.comments.length}
                        </span>
                      )}
                    </button>
                    <p className="mt-1.5 truncate font-mono text-[11px] text-muted" title={selection.photo.filename}>
                      {selection.photo.filename}
                    </p>
                    {selection.selected_at && (
                      <p className="font-mono text-[10px] text-faint" title={dateTime(selection.selected_at)}>
                        {relative(selection.selected_at)}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Every comment, picked or not */}
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-section font-semibold">Comments</h3>
              <span className="font-mono text-xs text-faint">{totalComments}</span>
            </div>
            {lists.commented.length === 0 ? (
              <p className="rounded-card border border-dashed border-control px-5 py-8 text-center text-sm text-muted">No comments yet.</p>
            ) : (
              <ul className="divide-y divide-rule overflow-hidden rounded-card border border-line bg-surface">
                {lists.commented.map((photo, index) => (
                  <li key={photo.id}>
                    <button type="button" onClick={() => setOpen({ list: "comments", index })} className="flex w-full gap-3.5 p-4 text-start hover:bg-ground">
                      <Thumb photo={photo} className="size-14 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2">
                          <span className="truncate font-mono text-[13px] font-medium">{photo.filename}</span>
                          <span
                            className={cn(
                              "shrink-0 rounded-chip px-1.5 text-[11px] font-medium",
                              photo.is_selected ? "bg-accent-soft text-accent-ink" : "bg-raised text-muted",
                            )}
                          >
                            {photo.is_selected ? "Picked" : "Not picked"}
                          </span>
                        </p>
                        <CommentList comments={lists.comments.get(photo.id) ?? []} />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {open && (
        <ViewerOverlay
          title={open.list === "picks" ? "Client picks" : "Commented photos"}
          onClose={() => setOpen(null)}
          photos={open.list === "picks" ? lists.picks : lists.commented}
          index={open.index}
          onIndex={(index) => setOpen({ ...open, index })}
          total={(open.list === "picks" ? lists.picks : lists.commented).length}
          comments={lists.comments}
        />
      )}
    </div>
  );
}

function Thumb({ photo, className }: { photo: PhotoRef; className: string }) {
  return (
    <span className={cn("block overflow-hidden bg-raised", className)}>
      {photo.thumbnail_url && <img src={`${photo.thumbnail_url}?size=grid`} alt="" loading="lazy" className="size-full object-cover" />}
    </span>
  );
}
