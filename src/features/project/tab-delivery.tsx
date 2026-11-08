"use client";

import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/feedback";
import { FieldError, Input } from "@/components/ui/field";
import { LoadError } from "@/components/ui/notice";
import { Facts } from "@/components/ui/panel";
import { Pill } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { count, fileSize, longDate, number, plural, relative } from "@/lib/format";
import type { DeliveryExport, DeliveryTab as Delivery, ProjectDetail } from "@/lib/types";
import { projectKey } from "./use-project";
import { ViewerOverlay } from "./viewer-overlay";

type StepState = "done" | "current" | "upcoming" | "skipped";

export function DeliveryTab({ project, onOpenSettings }: { project: ProjectDetail; onOpenSettings: () => void }) {
  const client = useQueryClient();
  const confirm = useConfirm();
  const [link, setLink] = useState(project.delivery_folder_link ?? "");
  const [linkError, setLinkError] = useState<string>();
  const [completeError, setCompleteError] = useState<string>();
  const [busy, setBusy] = useState<"connect" | "sync" | "complete" | "paid" | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);

  const delivery = useQuery({
    queryKey: [...projectKey(project.id), "delivery"],
    queryFn: () => api.get<Delivery>(`/projects/${project.id}/delivery`),
    refetchInterval: (q) => {
      const data = q.state.data;
      return data && (data.syncing || data.pending > 0 || data.exports.some((item) => item.in_progress)) ? 5_000 : false;
    },
  });

  const refresh = () => {
    client.invalidateQueries({ queryKey: projectKey(project.id) });
    client.invalidateQueries({ queryKey: ["overview"] });
  };

  async function connect() {
    setBusy("connect");
    setLinkError(undefined);
    try {
      await api.post(`/projects/${project.id}/delivery/folder`, { deliveryLink: link });
      refresh();
    } catch (error) {
      setLinkError(error instanceof ApiError ? (error.field("deliveryLink") ?? error.message) : "Couldn't connect the folder.");
    } finally {
      setBusy(null);
    }
  }

  async function sync() {
    setBusy("sync");
    await api.post(`/projects/${project.id}/sync`, { kind: "final" }).finally(() => setBusy(null));
    refresh();
  }

  async function complete(total: number) {
    const ok = await confirm({
      title: "Deliver and mark completed?",
      message: `${project.client_name ?? "Your client"}'s link switches to the delivery gallery with ${total} final ${plural(total, "photo")}.`,
      confirmLabel: "Deliver now",
    });
    if (!ok) return;
    setBusy("complete");
    setCompleteError(undefined);
    try {
      await api.post(`/projects/${project.id}/delivery/complete`);
      refresh();
    } catch (error) {
      setCompleteError(error instanceof ApiError ? (error.field("delivery") ?? error.message) : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  async function setPaid(paid: boolean) {
    if (!paid) {
      const ok = await confirm({
        title: "Mark as unpaid?",
        message: "Downloads will lock and previews will be watermarked again.",
        confirmLabel: "Mark as unpaid",
        tone: "danger",
      });
      if (!ok) return;
    }
    setBusy("paid");
    await api.put(`/projects/${project.id}/delivery/payment`, { paid }).finally(() => setBusy(null));
    refresh();
  }

  if (delivery.isPending) return <Skeleton className="h-96 w-full rounded-card" />;
  if (delivery.isError) return <LoadError what="delivery" onRetry={() => delivery.refetch()} />;

  const data = delivery.data;
  const syncing = data.syncing || busy === "sync";
  const delivered = project.status.value === "completed";
  const connected = !!project.delivery_folder_id;

  const states: Record<"folder" | "sync" | "payment" | "deliver", StepState> = {
    folder: connected ? "done" : "current",
    sync: !connected ? "upcoming" : data.total > 0 ? "done" : "current",
    payment: !project.requires_payment ? "skipped" : project.paid_at ? "done" : data.total > 0 ? "current" : "upcoming",
    deliver: delivered ? "done" : data.can_complete ? "current" : "upcoming",
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <ol className="overflow-hidden rounded-card border border-line bg-surface">
        <Step n={1} state={states.folder} title="Connect the finals folder" description="A separate Google Drive folder with the edited photos, shared with the same service account.">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={link}
              onChange={(event) => setLink(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  connect();
                }
              }}
              placeholder="https://drive.google.com/drive/folders/…"
              aria-label="Delivery folder link"
              invalid={!!linkError}
            />
            <Button className="h-10" loading={busy === "connect"} onClick={connect}>
              {connected ? "Change folder" : "Connect"}
            </Button>
          </div>
          <FieldError message={linkError} />
        </Step>

        <Step
          n={2}
          state={states.sync}
          title="Sync the finals"
          description={
            !connected
              ? "Available once the folder is connected."
              : data.syncing
                ? "Syncing with Google Drive…"
                : `${count(data.total, "final photo")}${data.pending > 0 ? ` · caching ${data.pending} ${plural(data.pending, "preview")}` : ""}`
          }
          action={
            connected && (
              <Button size="sm" onClick={sync} disabled={syncing} icon={<RefreshCw className={cn("size-3.5", syncing && "animate-spin")} />}>
                {syncing ? "Syncing…" : "Sync finals"}
              </Button>
            )
          }
        >
          {connected && data.preview.length > 0 && (
            <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
              {data.preview.map((photo, index) => (
                <li key={photo.id} className="min-w-0">
                  <button type="button" onClick={() => setViewing(index)} className="group block aspect-square w-full overflow-hidden bg-raised" title={photo.filename}>
                    {photo.thumbnail_url && (
                      <img
                        src={`${photo.thumbnail_url}?size=grid`}
                        alt={photo.filename}
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                      />
                    )}
                  </button>
                </li>
              ))}
              {data.total > data.preview.length && (
                <li className="flex aspect-square items-center justify-center bg-raised font-mono text-xs text-muted">
                  +{number(data.total - data.preview.length)}
                </li>
              )}
            </ul>
          )}
        </Step>

        <Step
          n={3}
          state={states.payment}
          title="Payment"
          description={
            !project.requires_payment ? (
              <>
                Not required.{" "}
                <button type="button" onClick={onOpenSettings} className="font-medium text-ink underline underline-offset-4">
                  Require payment
                </button>{" "}
                to lock downloads until you confirm it.
              </>
            ) : project.paid_at ? (
              `Paid ${longDate(project.paid_at)}. Downloads are unlocked.`
            ) : (
              "Downloads are locked and previews watermarked until you confirm payment."
            )
          }
          action={
            project.requires_payment &&
            (project.paid_at ? (
              <Button size="sm" loading={busy === "paid"} onClick={() => setPaid(false)}>
                Mark as unpaid
              </Button>
            ) : (
              <Button size="sm" variant="primary" loading={busy === "paid"} onClick={() => setPaid(true)}>
                Confirm payment received
              </Button>
            ))
          }
        />

        <Step
          n={4}
          state={states.deliver}
          title={delivered ? "Delivered" : "Deliver to the client"}
          description={
            delivered
              ? "Your client sees the final gallery at their usual link."
              : data.can_complete
                ? "Switches the client's link to the delivery gallery and emails them."
                : data.total === 0
                  ? "Connect and sync the finals first."
                  : "Available once the project is in Selection or Editing."
          }
          action={
            !delivered && (
              <Button variant="accent" size="sm" disabled={!data.can_complete} loading={busy === "complete"} onClick={() => complete(data.total)}>
                Deliver &amp; complete
              </Button>
            )
          }
        >
          <FieldError message={completeError} />
        </Step>
      </ol>

      <aside className="space-y-6">
        <section>
          <h2 className="mb-2 text-sm font-semibold">Client downloads</h2>
          <div className="overflow-hidden rounded-card border border-line bg-surface">
            {data.exports.length === 0 ? (
              <p className="px-4 py-5 text-sm text-muted">No ZIP downloads requested yet.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {data.exports.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium text-ink tabular">
                        {item.size_label} · {count(item.total, "photo")}
                      </p>
                      <p className="text-xs text-muted">
                        {relative(item.created_at)}
                        {item.notify_email && ` · ${item.notify_email}`}
                      </p>
                    </div>
                    <ExportPill item={item} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-card border border-line bg-surface p-4">
          <h2 className="text-sm font-semibold">Delivery rules</h2>
          <Facts
            className="mt-3"
            rows={[
              ["Downloads", project.allow_download ? "Allowed" : "Off"],
              ["Payment", project.requires_payment ? (project.paid_at ? "Confirmed" : "Required") : "Not required"],
              ["Finals", number(data.total)],
            ]}
          />
          <button type="button" onClick={onOpenSettings} className="mt-4 text-[13px] font-medium text-muted underline-offset-4 hover:text-ink hover:underline">
            Change in Sharing →
          </button>
        </section>
      </aside>

      {viewing !== null && (
        <ViewerOverlay
          title="Finals"
          onClose={() => setViewing(null)}
          photos={data.preview}
          index={viewing}
          onIndex={setViewing}
          total={data.preview.length}
        />
      )}
    </div>
  );
}

function Step({
  n,
  state,
  title,
  description,
  action,
  children,
}: {
  n: number;
  state: StepState;
  title: string;
  description: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <li className={cn("flex gap-4 border-t border-rule p-5 first:border-t-0", state === "upcoming" && "opacity-60")} aria-current={state === "current" ? "step" : undefined}>
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-medium",
          state === "done" && "bg-ink text-ground",
          state === "current" && "bg-accent text-white",
          (state === "upcoming" || state === "skipped") && "border border-control text-muted",
        )}
      >
        {state === "done" ? <Check className="size-3.5" strokeWidth={3} /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              {title}
              {state === "skipped" && <Pill>Skipped</Pill>}
            </h3>
            <p className="mt-0.5 text-[13px] text-muted">{description}</p>
          </div>
          {action}
        </div>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </li>
  );
}

function ExportPill({ item }: { item: DeliveryExport }) {
  if (item.in_progress) return <Pill tone="info">Preparing {item.progress_percent}%</Pill>;
  if (item.is_usable) return <Pill tone="positive">Ready · {fileSize(item.file_size)}</Pill>;
  if (item.status === "failed") return <Pill tone="negative">Failed</Pill>;
  return <Pill>Expired</Pill>;
}
