"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Banknote, Check, ExternalLink, FolderOpen, Pencil } from "lucide-react";
import { BackLink, PageBody } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Dialog } from "@/components/ui/dialog";
import { PaymentBar, paymentLabel, PaymentSlider, paymentState } from "@/components/ui/payment";
import { EmptyState, LoadError } from "@/components/ui/notice";
import { StatusBadge } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/feedback";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { longDate, number, shortDate } from "@/lib/format";
import type { ProjectDetail } from "@/lib/types";
import { useForm } from "@/lib/use-form";
import { useQueryState } from "@/lib/use-query-state";
import { useTitle } from "@/lib/use-title";
import { STUDIO_COLORS } from "@/features/overview/studio-scene";
import { detailPayload, detailValues, DetailsFields } from "@/features/projects/details-fields";
import { useOptions } from "@/features/projects/use-options";
import { DeliveryTab } from "./tab-delivery";
import { PhotosTab } from "./tab-photos";
import { SelectionsTab } from "./tab-selections";
import { SettingsTab } from "./tab-settings";
import { TimelineTab } from "./tab-timeline";
import { ToolbarSlot } from "./toolbar-slot";
import { projectKey, useProject, useSetProject } from "./use-project";

const TABS = [
  { key: "photos", label: "Photos" },
  { key: "selections", label: "Client picks" },
  { key: "delivery", label: "Delivery" },
  { key: "timeline", label: "Timeline" },
  { key: "settings", label: "Settings" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function ProjectDetailScreen({ id }: { id: string }) {
  const project = useProject(id);
  const [editing, setEditing] = useState(false);
  const [toolbar, setToolbar] = useState<HTMLDivElement | null>(null);
  const url = useQueryState();
  const requested = url.get("tab", "photos");
  const tab: TabKey = TABS.some((item) => item.key === requested) ? (requested as TabKey) : "photos";
  const setTab = (key: TabKey) => url.set({ tab: key, page: null, filter: null, view: null, photo: null }, { defaults: { tab: "photos" } });

  useTitle(project.data?.title);

  if (project.isPending) {
    return (
      <div className="px-4 pb-10 pt-5 sm:px-6 lg:px-10">
        <Skeleton className="h-[188px] w-full rounded-board" />
        <Skeleton className="mt-4 h-[42px] w-[520px] max-w-full rounded-[12px]" />
        <Skeleton className="mt-4 h-96 w-full rounded-card" />
      </div>
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
  const station = stationOf(data);
  const stage = data.current_stage;

  return (
    <div className="px-4 pb-20 pt-5 sm:px-6 lg:px-10">
      {/* The board: who and what on the left, actions on the right, the five Overview stations along the bottom. */}
      <section className="relative overflow-hidden rounded-board border border-line bg-surface">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(var(--rule)_1px,transparent_1px),linear-gradient(90deg,var(--rule)_1px,transparent_1px)] [background-size:44px_44px]"
        />

        <div className="relative flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <nav aria-label="Breadcrumb" className="eyebrow flex items-center gap-1.5">
              <Link href="/projects" className="hover:text-ink">
                Projects
              </Link>
              <span aria-hidden="true">/</span>
              <span>{data.category ?? "Project"}</span>
            </nav>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 className="min-w-0 truncate text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">{data.title}</h1>
              {/* A draft without a Drive folder is a booking. */}
              <StatusBadge status={data.status.value === "draft" && !data.has_photos_folder ? { ...data.status, label: "Booked" } : data.status} />
              <PaidTag project={data} />
            </div>
            <p className="mt-0.5 text-[13px] text-muted">
              {data.client ? (
                <Link href={`/clients/${data.client.id}`} className="font-medium text-ink underline-offset-4 hover:underline">
                  {data.client.name}
                </Link>
              ) : (
                (data.client_name ?? "No client")
              )}
              {data.shoot_date && ` · shoot ${longDate(data.shoot_date)}${data.shoot_time ? `, ${data.shoot_time.slice(0, 5)}` : ""}`}
              {data.location && ` · ${data.location}`}
              {stage && (
                <span className={cn(stage.is_overdue && "text-negative")}>
                  {" · "}
                  {stage.label} {stage.is_overdue ? "overdue since" : "due"} {shortDate(stage.due_at)}
                </span>
              )}
              {data.booking_request && (
                <>
                  {" · "}
                  <Link href={`/bookings/${data.booking_request.id}`} className="font-medium text-ink underline-offset-4 hover:underline">
                    From booking request
                  </Link>
                </>
              )}
            </p>
            <div className="mt-3 max-w-md">
              <StationTrack station={station} />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <IconAction label="Edit details" onClick={() => setEditing(true)}>
              <Pencil className="size-4" />
            </IconAction>
            {data.drive_folder_link && (
              <IconAction label="Open Drive folder" href={data.drive_folder_link}>
                <FolderOpen className="size-4" />
              </IconAction>
            )}
            <IconAction label="Preview gallery" href={data.share_url}>
              <ExternalLink className="size-4" />
            </IconAction>
            <CopyButton text={data.share_url} variant="primary" copiedLabel="Link copied">
              Copy client link
            </CopyButton>
          </div>
        </div>

        {/* One toolbar row: the section chips, then whatever the open tab needs (filters, view, sync). */}
        <div className="relative flex flex-wrap items-center gap-2 border-t border-rule bg-surface/80 px-5 py-3">
          <div className="no-scrollbar max-w-full overflow-x-auto">
            <nav aria-label="Project sections" className="inline-flex items-center gap-1 rounded-[12px] border border-line bg-surface p-1">
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
                  "flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] px-3.5 text-[13px] font-semibold transition-colors",
                  active ? "bg-ink text-ground" : "text-muted hover:bg-raised hover:text-ink",
                )}
              >
                {item.label}
                {badge !== null && (
                  <span className={cn("font-mono text-[11px] font-normal tracking-normal tabular", active ? "opacity-70" : "text-faint")}>{number(badge)}</span>
                )}
              </button>
            );
          })}
            </nav>
          </div>
          <div ref={setToolbar} className="flex min-w-0 flex-1 flex-wrap items-center gap-2 empty:hidden" />
        </div>
      </section>

      <div className="mt-4">
        <ToolbarSlot.Provider value={toolbar}>
          {tab === "photos" && <PhotosTab project={data} />}
          {tab === "selections" && <SelectionsTab project={data} />}
          {tab === "delivery" && <DeliveryTab project={data} onOpenSettings={() => setTab("settings")} />}
          {tab === "timeline" && <TimelineTab project={data} />}
          {tab === "settings" && <SettingsTab project={data} onEditClient={() => setEditing(true)} />}
        </ToolbarSlot.Provider>
      </div>

      {editing && <EditDetailsDialog project={data} onClose={() => setEditing(false)} />}
    </div>
  );
}

// --- Workflow -------------------------------------------------------------

/** The Overview's five stations, in the same colours. Payment is a flag (the tag by the status), not a station. */
const STATIONS = [
  { label: "Set up", color: STUDIO_COLORS.purple },
  { label: "Picking", color: STUDIO_COLORS.blue },
  { label: "Review", color: STUDIO_COLORS.teal },
  { label: "Editing", color: STUDIO_COLORS.coral },
  { label: "Done", color: STUDIO_COLORS.green },
] as const;

/** Same placement as the Overview's stationOf, so a project sits at the same station on both screens. */
function stationOf(p: ProjectDetail): number {
  switch (p.status.value) {
    case "completed":
      return 4;
    case "editing":
      return 3;
    case "draft":
      return p.selection_submitted_at ? 2 : 0;
    default:
      return p.selection_submitted_at ? 2 : 1;
  }
}

function StationTrack({ station }: { station: number }) {
  return (
    <ol className="grid grid-cols-5 gap-1.5" aria-label={`Stage ${station + 1} of ${STATIONS.length}: ${STATIONS[station].label}`}>
      {STATIONS.map(({ label, color }, index) => {
        const current = index === station;
        return (
          <li key={label} className="min-w-0" aria-current={current ? "step" : undefined}>
            <span className="block h-1.5 rounded-full" style={{ background: index <= station ? color.r : "var(--active)" }} />
            <span
              className={cn(
                "mt-1.5 block truncate text-[11px]",
                current ? "font-semibold text-ink" : index < station ? "text-muted" : "text-faint",
                !current && "max-sm:invisible",
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * How much is paid, next to the status badge. Click it for a 0–100% slider
 * (`PUT /projects/{id}/payment {percent}`); anything in between is a down payment.
 */
function PaidTag({ project }: { project: ProjectDetail }) {
  const client = useQueryClient();
  const setProject = useSetProject(project.id);
  const toast = useToast();
  // Fixed to the viewport: the board around the header clips anything that overflows it.
  const [open, setOpen] = useState<{ top: number; left: number } | null>(null);
  const [draft, setDraft] = useState(project.paid_percent);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const percent = project.paid_percent;
  const state = paymentState(percent);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !ref.current?.contains(event.target as Node)) setOpen(null);
    };
    // A fixed popover would float away from its tag on scroll, so it closes instead.
    const dismiss = () => setOpen(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("scroll", dismiss);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("scroll", dismiss);
      window.removeEventListener("resize", dismiss);
    };
  }, [!!open]);

  async function save() {
    setBusy(true);
    try {
      const result = await api.put<{ paid: boolean; percent: number; paid_at: string | null }>(`/projects/${project.id}/payment`, { percent: draft });
      setProject({ ...project, is_paid: result.paid, paid_percent: result.percent, paid_at: result.paid_at });
      client.invalidateQueries({ queryKey: projectKey(project.id) });
      client.invalidateQueries({ queryKey: ["overview"] });
      client.invalidateQueries({ queryKey: ["projects"] });
      client.invalidateQueries({ queryKey: ["schedule"] });
      toast(result.percent >= 100 ? "Marked as paid in full." : result.percent > 0 ? `Down payment set to ${result.percent}%.` : "Marked as unpaid.");
      setOpen(null);
    } catch (error) {
      toast(error instanceof ApiError ? error.message : "Couldn't update the payment.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setDraft(percent);
          const rect = ref.current?.getBoundingClientRect();
          setOpen((value) => (value || !rect ? null : { top: rect.bottom + 6, left: Math.min(rect.left, window.innerWidth - 316) }));
        }}
        aria-expanded={!!open}
        aria-haspopup="dialog"
        title={state === "paid" && project.paid_at ? `Paid in full ${longDate(project.paid_at)}` : `${percent}% paid · click to change`}
        className={cn(
          "inline-flex h-6 flex-none items-center gap-1.5 whitespace-nowrap rounded-chip px-2 text-[11px] font-medium transition-colors",
          state === "paid"
            ? "bg-status-completed-soft text-status-completed hover:ring-1 hover:ring-status-completed"
            : state === "partial"
              ? "bg-status-selection-soft text-status-selection hover:ring-1 hover:ring-status-selection"
              : "border border-dashed border-control text-muted hover:border-faint hover:text-ink",
        )}
      >
        {state === "paid" ? <Check className="size-3" strokeWidth={3} aria-hidden="true" /> : <Banknote className="size-3" aria-hidden="true" />}
        {paymentLabel(percent)}
        {state === "partial" && <PaymentBar percent={percent} className="w-8" />}
      </button>

      {open && (
        <div role="dialog" aria-label="Payment" className="fixed z-50 w-[300px] rounded-card border border-line bg-surface p-4 shadow-float" style={{ top: open.top, left: Math.max(8, open.left) }}>
          <PaymentSlider value={draft} onChange={setDraft} disabled={busy} />
          <div className="mt-4 flex items-center justify-end gap-2 border-t border-rule pt-3">
            <Button size="sm" onClick={() => setOpen(null)} disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" onClick={save} loading={busy} disabled={draft === percent}>
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function IconAction({ label, onClick, href, children }: { label: string; onClick?: () => void; href?: string; children: ReactNode }) {
  const className = "flex size-9 items-center justify-center rounded-control border border-line bg-surface text-muted transition-colors hover:bg-raised hover:text-ink";
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className={className}>
      {children}
    </a>
  ) : (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={className}>
      {children}
    </button>
  );
}

// --- Edit details -----------------------------------------------------------

function EditDetailsDialog({ project, onClose }: { project: ProjectDetail; onClose: () => void }) {
  const options = useOptions();
  const setProject = useSetProject(project.id);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  // Opening the dialog always starts from the saved values.
  const form = useForm(detailValues(project));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await api.patch<{ project: ProjectDetail }>(`/projects/${project.id}/details`, detailPayload(form.values));
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
      title="Project details"
      description="Changes show up in your project list, schedule and the client's gallery straight away."
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
        <DetailsFields
          values={form.values}
          set={form.set}
          error={form.error}
          categories={options.data?.categories ?? []}
          client={project.client}
          autoFocus
        />
      </form>
    </Dialog>
  );
}
