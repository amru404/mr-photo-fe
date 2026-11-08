"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowRight, Check, ExternalLink, FolderOpen, Mail, Pencil, Phone } from "lucide-react";
import { BackLink, PageBody } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, LoadError } from "@/components/ui/notice";
import { StatusBadge } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/feedback";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { count, dateTime, longDate, number, relative, shortDate } from "@/lib/format";
import type { ProjectDetail } from "@/lib/types";
import { useForm } from "@/lib/use-form";
import { useQueryState } from "@/lib/use-query-state";
import { useTitle } from "@/lib/use-title";
import { DetailsFields } from "@/features/projects/details-fields";
import { useOptions } from "@/features/projects/use-options";
import { DeliveryTab } from "./tab-delivery";
import { PhotosTab } from "./tab-photos";
import { SelectionsTab } from "./tab-selections";
import { SettingsTab } from "./tab-settings";
import { TimelineTab } from "./tab-timeline";
import { useProject, useSetProject } from "./use-project";

const TABS = [
  { key: "photos", label: "Photos" },
  { key: "selections", label: "Client picks" },
  { key: "delivery", label: "Delivery" },
  { key: "timeline", label: "Timeline" },
  { key: "settings", label: "Sharing" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function ProjectDetailScreen({ id }: { id: string }) {
  const project = useProject(id);
  const url = useQueryState();
  const requested = url.get("tab", "photos");
  const tab: TabKey = TABS.some((item) => item.key === requested) ? (requested as TabKey) : "photos";
  const setTab = (key: TabKey) => url.set({ tab: key, page: null, filter: null, view: null, photo: null }, { defaults: { tab: "photos" } });

  useTitle(project.data?.title);

  if (project.isPending) {
    return (
      <PageBody>
        <Skeleton className="h-4 w-20" />
        <Skeleton className="mt-3 h-9 w-80" />
        <Skeleton className="mt-6 h-28 w-full rounded-card" />
        <Skeleton className="mt-6 h-96 w-full rounded-card" />
      </PageBody>
    );
  }

  if (project.isError) {
    const status = project.error instanceof ApiError ? project.error.status : 0;
    return (
      <PageBody>
        <BackLink href="/projects">Projects</BackLink>
        {status === 403 || status === 404 ? (
          <EmptyState title="Project not found" className="mt-6">
            It may have been removed, or it belongs to another account.
          </EmptyState>
        ) : (
          <div className="mt-6">
            <LoadError what="this project" onRetry={() => project.refetch()} />
          </div>
        )}
      </PageBody>
    );
  }

  const data = project.data;

  return (
    <>
      <div className="border-b border-line bg-surface">
        <div className="px-4 pt-6 sm:px-6 sm:pt-8 lg:px-10">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-muted">
            <Link href="/projects" className="hover:text-ink">
              Projects
            </Link>
            <span aria-hidden="true">/</span>
            <span className="truncate text-ink">{data.title}</span>
          </nav>

          <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="min-w-0 truncate text-[1.625rem] font-semibold leading-9 tracking-[-0.025em] sm:text-[2rem] sm:leading-10">{data.title}</h1>
                <StatusBadge status={data.status} />
              </div>
              <p className="mt-1 text-sm text-muted">
                {[data.client_name ?? "No client", data.category, data.shoot_date && `shot ${longDate(data.shoot_date)}`].filter(Boolean).join(" · ")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <EditDetailsButton project={data} />
              {data.drive_folder_link && (
                <a
                  href={data.drive_folder_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-2 rounded-control border border-control bg-surface px-3.5 text-sm font-medium text-ink transition-colors hover:bg-raised"
                >
                  <FolderOpen className="size-4" />
                  Drive
                </a>
              )}
              <a
                href={data.share_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-control border border-control bg-surface px-3.5 text-sm font-medium text-ink transition-colors hover:bg-raised"
              >
                <ExternalLink className="size-4" />
                Preview gallery
              </a>
              <CopyButton text={data.share_url} variant="primary" copiedLabel="Link copied">
                Copy client link
              </CopyButton>
            </div>
          </div>

          <Workflow project={data} onTab={setTab} />

          <nav className="no-scrollbar -mb-px mt-6 flex gap-1 overflow-x-auto" aria-label="Project sections">
            {TABS.map((item) => {
              const active = item.key === tab;
              const badge =
                item.key === "photos" ? data.counts.photos
                : item.key === "selections" ? data.counts.selections
                : item.key === "delivery" ? data.counts.finals
                : null;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative inline-flex h-11 items-center gap-2 whitespace-nowrap px-3 text-sm transition-colors",
                    active ? "font-medium text-ink" : "text-muted hover:text-ink",
                  )}
                >
                  {item.label}
                  {badge !== null && (
                    <span className={cn("rounded-chip px-1.5 font-mono text-[11px] tabular", active ? "bg-accent-soft text-accent-ink" : "bg-raised text-faint")}>
                      {number(badge)}
                    </span>
                  )}
                  {active && <span aria-hidden="true" className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" />}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="px-4 pb-20 pt-7 sm:px-6 lg:px-10">
        {tab === "photos" && <PhotosTab project={data} />}
        {tab === "selections" && <SelectionsTab project={data} />}
        {tab === "delivery" && <DeliveryTab project={data} onOpenSettings={() => setTab("settings")} />}
        {tab === "timeline" && <TimelineTab project={data} />}
        {tab === "settings" && <SettingsTab project={data} />}
      </div>
    </>
  );
}

// --- Workflow -------------------------------------------------------------

const STEPS = ["Set up", "Client picking", "Editing", "Delivered"] as const;

function stepOf(project: ProjectDetail): number {
  switch (project.status.value) {
    case "draft":
      return 0;
    case "selection":
      return project.selection_submitted_at ? 2 : 1;
    case "editing":
      return 2;
    case "completed":
      return 4;
    default:
      return 1;
  }
}

/** What the photographer should do next, and the tab where it happens. */
function nextStep(project: ProjectDetail): { title: string; detail: string; tab?: TabKey; action?: string } {
  const client = project.client_name ?? "The client";
  const stage = project.current_stage;
  const due = stage ? ` · ${stage.label} ${stage.is_overdue ? "overdue since" : "due"} ${shortDate(stage.due_at)}` : "";

  if (project.status.value === "expired" || project.share_expired) {
    return { title: "The gallery link has expired", detail: "Extend the expiry date so the client can open it again.", tab: "settings", action: "Fix sharing" };
  }
  if (project.counts.photos === 0) {
    return { title: "Waiting for photos from Drive", detail: "Add photos to the Drive folder, then sync.", tab: "photos", action: "Open photos" };
  }
  if (project.can_move_to_editing && project.selection_submitted_at) {
    return {
      title: `${client} sent ${count(project.counts.selections, "pick")}`,
      detail: `Submitted ${relative(project.selection_submitted_at)}. Review them and move the project to editing.${due}`,
      tab: "selections",
      action: "Review picks",
    };
  }
  if (project.can_move_to_editing) {
    return {
      title: `Waiting for ${client} to pick`,
      detail: `${project.last_viewed_at ? `Gallery opened ${relative(project.last_viewed_at)}` : "Gallery not opened yet"} · ${count(project.counts.selections, "photo")} picked so far${due}`,
    };
  }
  if (project.status.value === "editing") {
    return project.delivery_folder_id
      ? { title: "Deliver the finals", detail: `${count(project.counts.finals, "final")} synced. Mark completed to switch the client to the delivery gallery.${due}`, tab: "delivery", action: "Go to delivery" }
      : { title: "Edit, then connect the finals folder", detail: `Put the edited photos in a separate Drive folder and connect it.${due}`, tab: "delivery", action: "Connect folder" };
  }
  if (project.requires_payment && !project.paid_at) {
    return { title: "Payment not confirmed", detail: "Downloads stay locked and previews watermarked until you confirm payment.", tab: "delivery", action: "Confirm payment" };
  }
  return { title: "Delivered", detail: `${count(project.counts.finals, "final photo")} in ${client}'s delivery gallery.` };
}

function Workflow({ project, onTab }: { project: ProjectDetail; onTab: (tab: TabKey) => void }) {
  const step = stepOf(project);
  const next = nextStep(project);

  return (
    <section aria-label="Workflow" className="mt-6 grid gap-4 rounded-card border border-line bg-ground p-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center lg:gap-8 lg:p-5">
      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map((label, index) => {
          const done = index < step;
          const current = index === step;
          return (
            <li key={label} aria-current={current ? "step" : undefined}>
              <span className={cn("block h-1 rounded-full", done ? "bg-ink" : current ? "bg-accent" : "bg-line")} />
              <span className={cn("mt-2 flex items-center gap-1 text-xs", done || current ? "font-medium text-ink" : "text-faint")}>
                {done && <Check className="size-3 shrink-0" strokeWidth={3} />}
                <span className="truncate">{label}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-3 border-line sm:flex-row sm:items-center sm:justify-between lg:border-s lg:ps-8">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-faint">Next step</p>
          <p className="mt-0.5 text-sm font-semibold text-ink">{next.title}</p>
          <p className="mt-0.5 text-[13px] text-muted">{next.detail}</p>
        </div>
        {next.tab && next.action && (
          <Button variant="accent" size="sm" onClick={() => onTab(next.tab!)} className="self-start sm:self-center">
            {next.action}
            <ArrowRight className="size-3.5" />
          </Button>
        )}
      </div>

      <ClientStrip project={project} />
    </section>
  );
}

function ClientStrip({ project }: { project: ProjectDetail }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-4 text-[13px] sm:grid-cols-4 lg:col-span-2">
      <Fact label="Client">{project.client_name || <span className="text-faint">—</span>}</Fact>
      <Fact label="Email">
        {project.client_email ? (
          <a href={`mailto:${project.client_email}`} className="inline-flex min-w-0 items-center gap-1.5 hover:underline">
            <Mail className="size-3.5 shrink-0 text-faint" />
            <span className="truncate">{project.client_email}</span>
          </a>
        ) : (
          <span className="text-faint">Not added</span>
        )}
      </Fact>
      <Fact label="Phone">
        {project.client_phone ? (
          <span className="flex min-w-0 items-center gap-2">
            <a href={`tel:${project.client_phone}`} className="inline-flex min-w-0 items-center gap-1.5 hover:underline">
              <Phone className="size-3.5 shrink-0 text-faint" />
              <span className="truncate">{project.client_phone}</span>
            </a>
            {project.whatsapp_url && (
              <a href={project.whatsapp_url} target="_blank" rel="noopener noreferrer" className="shrink-0 font-medium text-positive hover:underline">
                WhatsApp
              </a>
            )}
          </span>
        ) : (
          <span className="text-faint">Not added</span>
        )}
      </Fact>
      <Fact label="Last seen">
        {project.last_viewed_at ? (
          <span title={dateTime(project.last_viewed_at)}>Opened {relative(project.last_viewed_at)}</span>
        ) : (
          <span className="text-faint">Not opened yet</span>
        )}
      </Fact>
    </dl>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 truncate font-medium text-ink">{children}</dd>
    </div>
  );
}

// --- Edit details -----------------------------------------------------------

function EditDetailsButton({ project }: { project: ProjectDetail }) {
  const [editing, setEditing] = useState(false);
  return (
    <>
      <Button icon={<Pencil className="size-3.5" />} onClick={() => setEditing(true)}>
        Edit
      </Button>
      {editing && <EditDetailsDialog project={project} onClose={() => setEditing(false)} />}
    </>
  );
}

function EditDetailsDialog({ project, onClose }: { project: ProjectDetail; onClose: () => void }) {
  const options = useOptions();
  const setProject = useSetProject(project.id);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  // Opening the dialog always starts from the saved values.
  const form = useForm({
    title: project.title,
    client_name: project.client_name ?? "",
    client_email: project.client_email ?? "",
    client_phone: project.client_phone ?? "",
    shoot_date: project.shoot_date ?? "",
    category: project.category ?? "",
  });

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await api.patch<{ project: ProjectDetail }>(`/projects/${project.id}/details`, form.values);
      setProject(result.project);
      toast("Details saved.");
      onClose();
    } catch (error) {
      form.capture(error, "title");
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title="Project & client details"
      description="Changes show up in your project list and on the client's gallery straight away."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="edit-details" loading={busy}>
            Save details
          </Button>
        </>
      }
    >
      <form id="edit-details" onSubmit={save} noValidate>
        <DetailsFields values={form.values} set={form.set} error={form.error} categories={options.data?.categories ?? []} autoFocus />
      </form>
    </Dialog>
  );
}
