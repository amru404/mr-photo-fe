"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { Check, FolderCheck } from "lucide-react";
import { BackLink, PageBody, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { DaysPicker } from "@/components/ui/days-picker";
import { Field, FieldError, Input, PasswordInput } from "@/components/ui/field";
import { LoadError, Notice } from "@/components/ui/notice";
import { Panel, PanelFooter } from "@/components/ui/panel";
import { Pill } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/spinner";
import { SwitchRow } from "@/components/ui/switch";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { flash } from "@/lib/flash";
import { addDays, count, daysBetween, isoDay, longDate, number, shortDate } from "@/lib/format";
import type { FolderPreview, Options, StageValue } from "@/lib/types";
import { useForm } from "@/lib/use-form";
import { useTitle } from "@/lib/use-title";
import { DetailsFields } from "./details-fields";
import { useOptions } from "./use-options";

const STEP_FIELDS: Record<number, string[]> = {
  1: ["title", "client_name", "client_email", "client_phone", "shoot_date", "category"],
  2: ["drive_folder_link"],
  3: ["timeline"],
  4: ["share_password", "share_expires_at", "max_selectable_photos", "allow_comments", "allow_download", "requires_payment"],
};

function stepOf(field: string): number {
  const root = field.split(".")[0];
  return Number(Object.entries(STEP_FIELDS).find(([, fields]) => fields.includes(root))?.[0] ?? 1);
}

export function NewProjectWizard() {
  useTitle("New project");
  const options = useOptions();

  return (
    <PageBody width="wide">
      <PageHeader back={<BackLink href="/projects">Projects</BackLink>} title="New project" />
      <div className="mt-8">
        {options.isPending ? (
          <Skeleton className="h-96 w-full" />
        ) : options.isError ? (
          <LoadError what="the project form" onRetry={() => options.refetch()} />
        ) : (
          <Wizard options={options.data} />
        )}
      </div>
    </PageBody>
  );
}

function Wizard({ options }: { options: Options }) {
  const router = useRouter();
  const steps = Object.values(options.steps);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [folder, setFolder] = useState<FolderPreview | null>(null);
  const [connecting, setConnecting] = useState(false);

  const form = useForm({
    title: "",
    client_name: "",
    client_email: "",
    client_phone: "",
    shoot_date: "",
    category: "",
    drive_folder_link: "",
    timeline: Object.fromEntries(options.stages.map((stage) => [stage.value, stage.default_days])) as Record<StageValue, number | "">,
    share_password: "",
    share_expires_at: "",
    max_selectable_photos: "",
    allow_comments: true,
    allow_download: false,
    requires_payment: false,
  });
  const { values } = form;

  const preview = useMemo(() => {
    let cursor = new Date();
    return options.stages.map((stage) => {
      const days = Math.max(0, Number(values.timeline[stage.value]) || 0);
      const startsAt = cursor;
      const dueAt = addDays(startsAt, days);
      cursor = dueAt;
      return { ...stage, startsAt, dueAt };
    });
  }, [options.stages, values.timeline]);

  const totalDays = Object.values(values.timeline).reduce<number>((sum, days) => sum + (Number(days) || 0), 0);
  const last = preview[preview.length - 1];

  async function connectFolder() {
    setConnecting(true);
    try {
      const result = await api.post<{ folder: FolderPreview }>("/projects/drive-folder", { drive_folder_link: values.drive_folder_link });
      setFolder(result.folder);
    } catch (error) {
      setFolder(null);
      form.capture(error, "drive_folder_link");
    } finally {
      setConnecting(false);
    }
  }

  async function next(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (step < steps.length) {
        await api.post("/projects/validate-step", { step, ...values });
        setStep(step + 1);
      } else {
        const result = await api.post<{ message: string }>("/projects", values);
        flash.set(result.message);
        router.push("/projects");
        return;
      }
    } catch (error) {
      form.capture(error);
      if (error instanceof ApiError && error.isValidation) {
        const first = Object.keys(error.errors)[0];
        if (first) setStep(Math.min(step, stepOf(first)));
      }
    }
    setBusy(false);
  }

  const timelineError = (stage: StageValue) => form.error(`timeline.${stage}`);

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
      {/* Steps: a real ordered list; finished ones can be revisited. */}
      <ol className="flex gap-2 overflow-x-auto lg:sticky lg:top-8 lg:block lg:space-y-1 lg:self-start" aria-label="Steps">
        {steps.map((label, index) => {
          const number = index + 1;
          const done = number < step;
          const current = number === step;
          return (
            <li key={label} className="flex-1 lg:flex-none">
              <button
                type="button"
                disabled={!done}
                onClick={() => setStep(number)}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "flex w-full min-w-28 items-start gap-3 rounded-control px-3 py-2.5 text-start transition-colors",
                  current && "bg-surface ring-1 ring-line",
                  done && "hover:bg-raised",
                )}
              >
                <span
                  className={cn(
                    "mt-px flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular",
                    done && "bg-primary text-on-primary",
                    current && "bg-accent text-white dark:text-on-primary",
                    !done && !current && "border border-control text-muted",
                  )}
                >
                  {done ? <Check className="size-3" strokeWidth={3} /> : number}
                </span>
                <span className="min-w-0">
                  <span className={cn("block text-sm", current || done ? "font-medium text-ink" : "text-muted")}>{label}</span>
                  <StepSummary step={number} done={done} values={values} folder={folder} totalDays={totalDays} />
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <form onSubmit={next} noValidate>
        <Panel>
          <div className="p-5 sm:p-7">
            {step === 1 && (
              <StepIntro title="Project details" text="Who is this gallery for, and what was the shoot?">
                <DetailsFields values={values} set={form.set} error={form.error} categories={options.categories} autoFocus />
              </StepIntro>
            )}

            {step === 2 && (
              <StepIntro title="Connect Google Drive folder" text="Paste the share link of the folder that holds this shoot's photos.">
                <Notice tone="info">
                  Share the folder with{" "}
                  {options.service_account_email ? (
                    <span className="break-all font-semibold">{options.service_account_email}</span>
                  ) : (
                    <span className="font-semibold">your service account email</span>
                  )}{" "}
                  (Viewer access is enough).
                </Notice>

                <div className="mt-6">
                  <Field label="Drive folder link" error={form.error("drive_folder_link")}>
                    {(id) => (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          id={id}
                          autoFocus
                          placeholder="https://drive.google.com/drive/folders/…"
                          value={values.drive_folder_link}
                          onChange={(event) => {
                            form.set("drive_folder_link", event.target.value);
                            setFolder(null);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              connectFolder();
                            }
                          }}
                          invalid={!!form.error("drive_folder_link")}
                        />
                        <Button className="h-10" loading={connecting} onClick={connectFolder}>
                          {connecting ? "Connecting…" : folder ? "Refresh" : "Connect"}
                        </Button>
                      </div>
                    )}
                  </Field>
                </div>

                {connecting ? (
                  <div className="mt-6">
                    <Skeleton className="h-5 w-48" />
                    <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {Array.from({ length: 6 }, (_, index) => (
                        <Skeleton key={index} className="aspect-square w-full" />
                      ))}
                    </div>
                  </div>
                ) : (
                  folder && <FolderResult folder={folder} />
                )}
              </StepIntro>
            )}

            {step === 3 && (
              <StepIntro
                title="Project timeline"
                text="How many days does each stage get? The next stage starts as soon as one is done, so finishing early moves every later date forward."
              >
                <ol className="divide-y divide-rule rounded-card border border-line">
                  {preview.map((entry) => (
                    <li key={entry.value} className="p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink">{entry.label}</p>
                          <p className="text-[13px] text-muted">{entry.description}</p>
                        </div>
                        <p className="text-xs text-muted tabular">
                          {shortDate(entry.startsAt)} – {shortDate(entry.dueAt)}
                        </p>
                      </div>
                      <DaysPicker
                        className="mt-3"
                        label={`${entry.label} duration`}
                        presets={options.timeline_presets}
                        max={options.timeline_max_days}
                        value={values.timeline[entry.value]}
                        onChange={(days) => {
                          form.set("timeline", { ...values.timeline, [entry.value]: days });
                          form.setErrors(({ [`timeline.${entry.value}`]: _removed, ...rest }) => rest);
                        }}
                      />
                      <FieldError message={timelineError(entry.value)} />
                    </li>
                  ))}
                </ol>
                {last && (
                  <p className="mt-4 rounded-control bg-raised px-4 py-3 text-sm text-muted">
                    If every stage takes its full time, the client will have finished downloading by{" "}
                    <span className="font-semibold text-ink">{longDate(last.dueAt)}</span> ({count(daysBetween(new Date(), last.dueAt), "day")} from today).
                  </p>
                )}
              </StepIntro>
            )}

            {step === 4 && (
              <StepIntro title="Sharing settings" text="Control how your client accesses and uses the gallery.">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Gallery password / PIN" error={form.error("share_password")}>
                    {(id) => (
                      <PasswordInput
                        id={id}
                        placeholder="Optional"
                        autoComplete="new-password"
                        value={values.share_password}
                        onChange={(e) => form.set("share_password", e.target.value)}
                        invalid={!!form.error("share_password")}
                      />
                    )}
                  </Field>
                  <Field label="Link expires on" error={form.error("share_expires_at")}>
                    {(id) => (
                      <Input
                        id={id}
                        type="date"
                        min={isoDay(addDays(new Date(), 1))}
                        value={values.share_expires_at}
                        onChange={(e) => form.set("share_expires_at", e.target.value)}
                        invalid={!!form.error("share_expires_at")}
                      />
                    )}
                  </Field>
                  <Field label="Maximum photos the client can select" error={form.error("max_selectable_photos")} className="sm:col-span-2">
                    {(id) => (
                      <Input
                        id={id}
                        type="number"
                        min={1}
                        inputMode="numeric"
                        placeholder="No limit"
                        className="sm:w-48"
                        value={values.max_selectable_photos}
                        onChange={(e) => form.set("max_selectable_photos", e.target.value)}
                        invalid={!!form.error("max_selectable_photos")}
                      />
                    )}
                  </Field>
                </div>

                <div className="mt-4 divide-y divide-rule border-t border-rule">
                  <SwitchRow label="Allow comments" description="Clients can leave notes on individual photos." checked={values.allow_comments} onChange={(v) => form.set("allow_comments", v)} />
                  <SwitchRow label="Allow downloads" description="Clients can download photos from the final delivery gallery." checked={values.allow_download} onChange={(v) => form.set("allow_download", v)} />
                  <SwitchRow label="Require payment before download" description="Downloads stay locked until you confirm payment." checked={values.requires_payment} onChange={(v) => form.set("requires_payment", v)} />
                </div>

                <dl className="mt-2 grid gap-4 rounded-control bg-raised p-4 text-sm sm:grid-cols-4">
                  {[
                    ["Project", values.title],
                    ["Client", values.client_name],
                    ["Photos", number(folder?.photo_count ?? 0)],
                    ["Timeline", count(totalDays, "day")],
                  ].map(([term, value]) => (
                    <div key={term} className="min-w-0">
                      <dt className="text-muted">{term}</dt>
                      <dd className="truncate font-semibold text-ink tabular">{value || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </StepIntro>
            )}
          </div>

          <PanelFooter className="justify-between">
            <div>{step > 1 && <Button onClick={() => setStep(step - 1)}>Back</Button>}</div>
            <Button type="submit" variant="primary" loading={busy}>
              {step === steps.length ? "Create project" : "Continue"}
            </Button>
          </PanelFooter>
        </Panel>
      </form>
    </div>
  );
}

function StepIntro({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <>
      <h2 className="text-section font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-muted">{text}</p>
      <div className="mt-6">{children}</div>
    </>
  );
}

function FolderResult({ folder }: { folder: FolderPreview }) {
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <FolderCheck className="size-4 text-positive" aria-hidden="true" />
          {folder.name}
        </p>
        <Pill tone="accent">{count(folder.photo_count, "photo found", "photos found")}</Pill>
      </div>

      {folder.photo_count === 0 ? (
        <Notice tone="warning" className="mt-4">
          This folder has no photos yet. You can still create the project; photos will appear once they&rsquo;re uploaded and the folder is re-synced.
        </Notice>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {folder.preview.map((photo) => (
              <figure key={photo.drive_file_id} className="min-w-0">
                <img src={photo.url} alt={photo.filename} loading="lazy" className="aspect-square w-full bg-raised object-cover" />
                <figcaption className="mt-1 truncate text-xs text-muted" title={photo.filename}>
                  {photo.filename}
                </figcaption>
              </figure>
            ))}
          </div>
          {folder.photo_count > folder.preview.length && (
            <p className="mt-3 text-sm text-muted">+ {number(folder.photo_count - folder.preview.length)} more will be imported.</p>
          )}
        </>
      )}
    </div>
  );
}

function StepSummary({
  step,
  done,
  values,
  folder,
  totalDays,
}: {
  step: number;
  done: boolean;
  values: { title: string; client_name: string; share_password: string };
  folder: FolderPreview | null;
  totalDays: number;
}) {
  if (!done) return null;
  const text =
    step === 1 ? [values.title, values.client_name].filter(Boolean).join(" · ")
    : step === 2 ? (folder ? `${folder.name} · ${count(folder.photo_count, "photo")}` : "")
    : step === 3 ? count(totalDays, "day")
    : "";
  return text ? <span className="mt-0.5 hidden truncate text-xs text-muted lg:block">{text}</span> : null;
}
