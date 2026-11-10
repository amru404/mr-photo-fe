"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { CalendarCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DaysPicker } from "@/components/ui/days-picker";
import { Field, FieldError, Input, PasswordInput } from "@/components/ui/field";
import { LoadError } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/spinner";
import { SwitchRow } from "@/components/ui/switch";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { flash } from "@/lib/flash";
import { paymentLabel, PaymentSlider } from "@/components/ui/payment";
import { addDays, count, daysBetween, isoDay, longDate, number, shortDate } from "@/lib/format";
import type { FolderPreview, Options, StageValue } from "@/lib/types";
import { useForm } from "@/lib/use-form";
import { useTitle } from "@/lib/use-title";
import { useClientOptions } from "@/features/clients/use-clients";
import { detailPayload, detailValues, DetailsFields } from "./details-fields";
import { FolderLinkField, FolderResult, FolderSkeleton, ShareWithNotice } from "./drive-folder";
import { useOptions } from "./use-options";

const STEP_FIELDS: Record<number, string[]> = {
  1: ["title", "client_id", "category_id", "shoot_date", "shoot_time", "location", "notes"],
  2: ["drive_folder_link"],
  3: ["timeline"],
  4: ["share_password", "share_expires_at", "max_selectable_photos", "allow_comments", "allow_download", "paid_percent"],
};

/** Photos are optional: a project can be just a booking until its Drive folder is connected. */
const PHOTOS_STEP = 2;

function stepOf(field: string): number {
  const root = field.split(".")[0];
  return Number(Object.entries(STEP_FIELDS).find(([, fields]) => fields.includes(root))?.[0] ?? 1);
}

export function NewProjectWizard() {
  useTitle("New project");
  const options = useOptions();

  return (
    <div className="px-4 pb-10 pt-5 sm:px-6 lg:px-10">
      {/* The board header, as on the project page. */}
      <section className="relative overflow-hidden rounded-board border border-line bg-surface">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(var(--rule)_1px,transparent_1px),linear-gradient(90deg,var(--rule)_1px,transparent_1px)] [background-size:44px_44px]"
        />
        <div className="relative p-5">
          <nav aria-label="Breadcrumb" className="eyebrow flex items-center gap-1.5">
            <Link href="/projects" className="hover:text-ink">
              Projects
            </Link>
            <span aria-hidden="true">/</span>
            <span>New project</span>
          </nav>
          <h1 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">New project</h1>
          <p className="mt-0.5 text-[13px] text-muted">Book a shoot for a client. Photos are optional — connect the Drive folder now or later.</p>
        </div>
      </section>

      <div className="mt-4">
        {options.isPending ? (
          <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <Skeleton className="h-56 w-full rounded-card" />
            <Skeleton className="h-96 w-full rounded-card" />
          </div>
        ) : options.isError ? (
          <LoadError what="the project form" onRetry={() => options.refetch()} />
        ) : (
          <Wizard options={options.data} />
        )}
      </div>
    </div>
  );
}

function Wizard({ options }: { options: Options }) {
  const router = useRouter();
  const params = useSearchParams();
  const steps = Object.values(options.steps);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState<"next" | "book" | null>(null);
  const [folder, setFolder] = useState<FolderPreview | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const clients = useClientOptions();

  // "New project for this client" and the schedule link here with ?client_id= and ?shoot_date=.
  const prefillDate = params.get("shoot_date") ?? "";
  const form = useForm({
    ...detailValues(),
    client_id: (Number(params.get("client_id")) || "") as number | "",
    shoot_date: /^\d{4}-\d{2}-\d{2}$/.test(prefillDate) ? prefillDate : "",
    drive_folder_link: "",
    timeline: Object.fromEntries(options.stages.map((stage) => [stage.value, stage.default_days])) as Record<StageValue, number | "">,
    share_password: "",
    share_expires_at: "",
    max_selectable_photos: "",
    allow_comments: true,
    allow_download: false,
    paid_percent: 0,
  });
  const { values } = form;
  const clientName = clients.data?.find((client) => client.id === values.client_id)?.name ?? picked ?? "";

  // Same start as the server: the shoot day when it's still ahead, otherwise today.
  const timelineStart = useMemo(() => {
    const today = new Date();
    if (!values.shoot_date) return today;
    const [y, m, d] = values.shoot_date.split("-").map(Number);
    const shoot = new Date(y, m - 1, d);
    return shoot > today ? shoot : today;
  }, [values.shoot_date]);

  const preview = useMemo(() => {
    let cursor = timelineStart;
    return options.stages.map((stage) => {
      const days = Math.max(0, Number(values.timeline[stage.value]) || 0);
      const startsAt = cursor;
      const dueAt = addDays(startsAt, days);
      cursor = dueAt;
      return { ...stage, startsAt, dueAt };
    });
  }, [options.stages, values.timeline, timelineStart]);

  const totalDays = Object.values(values.timeline).reduce<number>((sum, days) => sum + (Number(days) || 0), 0);
  const last = preview[preview.length - 1];

  async function connectFolder(): Promise<boolean> {
    setConnecting(true);
    try {
      const result = await api.post<{ folder: FolderPreview }>("/projects/drive-folder", { drive_folder_link: values.drive_folder_link });
      setFolder(result.folder);
      return true;
    } catch (error) {
      setFolder(null);
      form.capture(error, "drive_folder_link");
      return false;
    } finally {
      setConnecting(false);
    }
  }

  /** What the API takes: ids for the details, and the folder only once it has been connected. */
  function payload(withFolder = true) {
    const { title: _t, client_id: _c, category_id: _k, shoot_date: _d, shoot_time: _s, location: _l, notes: _n, drive_folder_link, ...rest } = values;
    return {
      ...detailPayload(values),
      ...rest,
      drive_folder_link: withFolder && folder ? drive_folder_link : null,
    };
  }

  async function create(withFolder = true) {
    const result = await api.post<{ message: string }>("/projects", payload(withFolder));
    flash.set(result.message);
    router.push("/projects");
  }

  async function run(kind: "next" | "book", action: () => Promise<void>) {
    setBusy(kind);
    try {
      await action();
      // Creating navigates away; keep the button busy until then.
      if (kind === "book" || step === steps.length) return;
    } catch (error) {
      form.capture(error);
      if (error instanceof ApiError && error.isValidation) {
        const first = Object.keys(error.errors)[0];
        if (first) setStep(Math.min(step, stepOf(first)));
      }
    }
    setBusy(null);
  }

  async function next(event: React.FormEvent) {
    event.preventDefault();
    // A pasted link that wasn't connected yet is connected first, so it isn't dropped silently.
    if (step === PHOTOS_STEP && values.drive_folder_link.trim() && !folder && !(await connectFolder())) return;
    run("next", async () => {
      if (step < steps.length) {
        await api.post("/projects/validate-step", { step, ...payload() });
        setStep(step + 1);
      } else {
        await create();
      }
    });
  }

  /** "Skip — just book": create the booking now, without photos; the folder can be connected later. */
  function book() {
    form.set("drive_folder_link", "");
    setFolder(null);
    run("book", () => create(false));
  }

  const timelineError = (stage: StageValue) => form.error(`timeline.${stage}`);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      {/* Steps: a deck with a real ordered list; finished ones can be revisited. */}
      <nav aria-label="Steps" className="rounded-card border border-line bg-surface lg:sticky lg:top-20">
        <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
          <span className="deck-title">Steps</span>
          <span className="font-mono text-xs text-faint tabular">
            {step} / {steps.length}
          </span>
        </div>
        <ol className="no-scrollbar flex gap-1 overflow-x-auto p-1.5 lg:block lg:space-y-1">
          {steps.map((label, index) => {
            const number = index + 1;
            const done = number < step;
            const current = number === step;
            return (
              <li key={label} className="min-w-36 flex-1 lg:min-w-0">
                <button
                  type="button"
                  disabled={!done}
                  onClick={() => setStep(number)}
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "group flex w-full items-start gap-3 rounded-[10px] px-2.5 py-2 text-start transition-colors",
                    current && "bg-ink text-ground",
                    done && "hover:bg-raised",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 min-w-8 shrink-0 items-center justify-center rounded-[6px] px-1.5 font-mono text-[11px] tabular",
                      current && "bg-ground/15 text-ground",
                      done && "bg-raised text-positive group-hover:bg-active",
                      !done && !current && "bg-raised text-muted",
                    )}
                  >
                    {done ? <Check className="size-3.5" strokeWidth={3} aria-label="Done" /> : String(number).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 pt-0.5">
                    <span
                      className={cn(
                        "block truncate text-[13px] font-semibold",
                        current ? "text-ground" : done ? "text-ink" : "text-muted",
                      )}
                    >
                      {label}
                    </span>
                    <StepSummary step={number} done={done} title={values.title} client={clientName} folder={folder} totalDays={totalDays} />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <form onSubmit={next} noValidate className="min-w-0 space-y-4">
            {step === 1 && (
              <Deck title="Project details" text="Who is it for, and when and where is the shoot?">
                <DetailsFields
                  values={values}
                  set={(key, value) => form.set(key, value as never)}
                  error={form.error}
                  categories={options.categories}
                  onClient={(client) => setPicked(client?.name ?? null)}
                  autoFocus
                />
              </Deck>
            )}

            {step === PHOTOS_STEP && (
              <Deck
                title="Photos"
                aside={<span className="font-mono text-[11px] uppercase tracking-[0.08em] text-faint">Optional</span>}
                text="Already have this shoot's photos in Google Drive? Connect the folder now. If not, just book the shoot — you can connect the folder later from the project page."
              >
                <ShareWithNotice email={options.service_account_email} />

                <div className="mt-6">
                  <FolderLinkField
                    autoFocus
                    value={values.drive_folder_link}
                    onChange={(link) => {
                      form.set("drive_folder_link", link);
                      setFolder(null);
                    }}
                    onConnect={connectFolder}
                    connecting={connecting}
                    connected={!!folder}
                    error={form.error("drive_folder_link")}
                  />
                </div>

                {connecting ? (
                  <FolderSkeleton />
                ) : folder ? (
                  <FolderResult folder={folder} />
                ) : (
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-control border border-dashed border-control px-4 py-3.5">
                    <p className="flex min-w-0 flex-1 items-start gap-2.5 text-sm text-muted">
                      <CalendarCheck className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden="true" />
                      <span>
                        <span className="font-medium text-ink">No photos yet?</span> Book the shoot now; it goes on your schedule and the Drive folder can be connected
                        any time.
                      </span>
                    </p>
                    <Button onClick={book} loading={busy === "book"} disabled={busy === "next"}>
                      Skip — just book
                    </Button>
                  </div>
                )}
              </Deck>
            )}

            {step === 3 && (
              <Deck
                title="Project timeline"
                aside={<span className="font-mono text-xs text-faint tabular">{count(totalDays, "day")}</span>}
                text="How many days does each stage get? The next stage starts as soon as one is done, so finishing early moves every later date forward."
              >
                <ol className="divide-y divide-rule overflow-hidden rounded-[12px] border border-rule bg-ground/40">
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
                    <span className="font-semibold text-ink">{longDate(last.dueAt)}</span> ({count(daysBetween(new Date(), last.dueAt), "day")} from today{timelineStart > new Date() ? `, counting from the shoot on ${longDate(timelineStart)}` : ""}).
                  </p>
                )}
              </Deck>
            )}

            {step === 4 && (
              <>
              <Deck title="Access" text="Protect the gallery and decide how long the link stays open.">
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
              </Deck>

              <Deck title="What the client can do" text="Permissions inside the gallery.">
                <div className="-my-4 divide-y divide-rule">
                  <SwitchRow label="Allow comments" description="Clients can leave notes on individual photos." checked={values.allow_comments} onChange={(v) => form.set("allow_comments", v)} />
                  <SwitchRow label="Allow downloads" description="Clients can download photos from the final delivery gallery." checked={values.allow_download} onChange={(v) => form.set("allow_download", v)} />
                </div>
              </Deck>

              <Deck title="Payment" text="Already paid, or a down payment (DP)? Set how much came in. You can update it any time from the project page.">
                <PaymentSlider value={values.paid_percent} onChange={(percent) => form.set("paid_percent", percent)} />
              </Deck>

              <Deck title="Summary">
                <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-rule bg-rule text-sm sm:grid-cols-5">
                  {[
                    ["Project", values.title],
                    ["Client", clientName],
                    ["Photos", folder ? number(folder.photo_count) : "Later"],
                    ["Timeline", count(totalDays, "day")],
                    ["Payment", paymentLabel(values.paid_percent)],
                  ].map(([term, value]) => (
                    <div key={term} className="min-w-0 bg-surface px-4 py-3">
                      <dt className="text-xs text-muted">{term}</dt>
                      <dd className="mt-0.5 truncate font-mono text-[13px] font-medium text-ink tabular">{value || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </Deck>
              </>
            )}

        {/* Actions bar, styled like PanelFooter. */}
        <div className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface px-5 py-3">
          <div>{step > 1 && <Button onClick={() => setStep(step - 1)}>Back</Button>}</div>
          <div className="flex items-center gap-3">
            <span className="hidden font-mono text-xs text-faint tabular sm:inline">
              Step {step} of {steps.length}
            </span>
            <Button type="submit" variant="primary" loading={busy === "next"} disabled={busy === "book"}>
              {step === steps.length ? (folder ? "Create project" : "Book project") : "Continue"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

/** A form section as an Overview deck: deck-title header over a rule, then the fields. */
function Deck({ title, text, aside, children }: { title: string; text?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-surface">
      <header className="flex items-start justify-between gap-4 border-b border-rule px-5 py-4">
        <div className="min-w-0">
          <h2 className="deck-title">{title}</h2>
          {text && <p className="mt-1.5 text-[13px] text-muted">{text}</p>}
        </div>
        {aside && <div className="shrink-0 pt-px">{aside}</div>}
      </header>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function StepSummary({
  step,
  done,
  title,
  client,
  folder,
  totalDays,
}: {
  step: number;
  done: boolean;
  title: string;
  client: string;
  folder: FolderPreview | null;
  totalDays: number;
}) {
  if (!done) return null;
  const text =
    step === 1 ? [title, client].filter(Boolean).join(" · ")
    : step === PHOTOS_STEP ? (folder ? `${folder.name} · ${count(folder.photo_count, "photo")}` : "Booking only — connect later")
    : step === 3 ? count(totalDays, "day")
    : "";
  return text ? <span className="mt-0.5 hidden truncate text-xs normal-case tracking-normal text-muted lg:block">{text}</span> : null;
}
