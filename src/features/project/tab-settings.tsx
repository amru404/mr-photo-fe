"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Mail, Pencil, Phone, UserRound } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, ButtonLink } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { useConfirm } from "@/components/ui/feedback";
import { Checkbox, Field, Hint, Input, PasswordInput } from "@/components/ui/field";
import { Pill } from "@/components/ui/pill";
import { SwitchRow } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { dateTime, longDate, relative } from "@/lib/format";
import type { ProjectDetail } from "@/lib/types";
import { useForm } from "@/lib/use-form";
import { projectKey, useSetProject } from "./use-project";

function initialValues(project: ProjectDetail) {
  return {
    new_password: "",
    remove_password: false,
    share_expires_at: project.share_expires_at ?? "",
    max_selectable_photos: project.max_selectable_photos === null ? "" : String(project.max_selectable_photos),
    allow_comments: project.allow_comments,
    allow_download: project.allow_download,
  };
}

/** One settings card: what it is (and its current value) on the left, the controls on the right. */
function Section({ title, description, summary, children }: { title: string; description: string; summary?: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-5 rounded-card border border-line bg-surface p-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-10 lg:p-6">
      <div>
        <h2 className="deck-title">{title}</h2>
        <p className="mt-1.5 text-[13px] text-muted">{description}</p>
        {summary && <div className="mt-4">{summary}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
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

export function SettingsTab({ project, onEditClient }: { project: ProjectDetail; onEditClient: () => void }) {
  const client = useQueryClient();
  const confirm = useConfirm();
  const setProject = useSetProject(project.id);
  const form = useForm(initialValues(project));
  const [busy, setBusy] = useState<"save" | "regenerate" | null>(null);
  const [saved, setSaved] = useState(false);
  const [regenerated, setRegenerated] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy("save");
    try {
      const result = await api.put<{ project: ProjectDetail }>(`/projects/${project.id}/sharing`, form.values);
      setProject(result.project);
      form.setValues(initialValues(result.project));
      client.invalidateQueries({ queryKey: projectKey(project.id) });
      client.invalidateQueries({ queryKey: ["overview"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      form.capture(error, "share_expires_at");
    } finally {
      setBusy(null);
    }
  }

  async function regenerate() {
    const ok = await confirm({
      title: "Generate a new link?",
      message: "The current link will stop working immediately.",
      confirmLabel: "Regenerate link",
      tone: "danger",
    });
    if (!ok) return;
    setBusy("regenerate");
    try {
      const result = await api.post<{ project: ProjectDetail }>(`/projects/${project.id}/share-link`);
      setProject(result.project);
      setRegenerated(true);
      setTimeout(() => setRegenerated(false), 2500);
    } finally {
      setBusy(null);
    }
  }

  const { values } = form;

  return (
    <div className="space-y-4">
      <Section title="Client" description="Who this project is for and how to reach them.">
        <div>
          <dl className="grid gap-x-6 gap-y-4 text-[13px] sm:grid-cols-2">
            <Fact label="Name">
              {project.client ? (
                <Link href={`/clients/${project.client.id}`} className="hover:underline">
                  {project.client.name}
                </Link>
              ) : (
                project.client_name || <span className="text-faint">Not added</span>
              )}
            </Fact>
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
          <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-line pt-4">
            {project.client && (
              <ButtonLink href={`/clients/${project.client.id}`} size="sm" icon={<UserRound className="size-3.5" />}>
                Client profile
              </ButtonLink>
            )}
            <Button size="sm" icon={<Pencil className="size-3.5" />} onClick={onEditClient}>
              Change client
            </Button>
          </div>
        </div>
      </Section>

      <Section
        title="Client link"
        description="Send this link to your client. They don't need an account."
        summary={regenerated && <p className="text-sm font-medium text-positive">New link generated. The old one no longer works.</p>}
      >
        <div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={project.share_url}
              onFocus={(event) => event.target.select()}
              aria-label="Client gallery link"
              className="h-10 w-full min-w-0 rounded-control border border-line bg-surface px-3 font-mono text-[13px] text-ink"
            />
            <CopyButton text={project.share_url} variant="primary" copiedLabel="Copied!" className="h-10">
              Copy link
            </CopyButton>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-[13px] text-muted">Leaked or sent to the wrong person? Regenerating stops the old link.</p>
            <Button variant="danger" size="sm" loading={busy === "regenerate"} onClick={regenerate}>
              Regenerate link
            </Button>
          </div>
        </div>
      </Section>

      <form onSubmit={save} noValidate className="space-y-4">
        <Section
          title="Access"
          description="Protect the gallery and decide how long it stays open."
          summary={
            <ul className="flex flex-wrap gap-1.5">
              <Pill tone={project.has_password ? "positive" : "neutral"}>{project.has_password ? "Password on" : "No password"}</Pill>
              <Pill tone={project.share_expired ? "negative" : "neutral"}>
                {project.share_expires_at ? `${project.share_expired ? "Expired" : "Expires"} ${longDate(project.share_expires_at)}` : "Never expires"}
              </Pill>
            </ul>
          }
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Field
                label={project.has_password ? "Change password / PIN" : "Password / PIN"}
                aside={project.has_password && <Pill tone="positive">Protected</Pill>}
                error={form.error("new_password")}
              >
                {(id) => (
                  <PasswordInput
                    id={id}
                    autoComplete="new-password"
                    placeholder={project.has_password ? "Leave blank to keep current" : "No password set"}
                    disabled={values.remove_password}
                    value={values.new_password}
                    onChange={(e) => form.set("new_password", e.target.value)}
                    invalid={!!form.error("new_password")}
                  />
                )}
              </Field>
              {project.has_password && (
                <Checkbox className="mt-2" label="Remove password" checked={values.remove_password} onChange={(e) => form.set("remove_password", e.target.checked)} />
              )}
            </div>

            <div>
              <Field label="Link expires on" error={form.error("share_expires_at")}>
                {(id) => (
                  <Input
                    id={id}
                    type="date"
                    value={values.share_expires_at}
                    onChange={(e) => form.set("share_expires_at", e.target.value)}
                    invalid={!!form.error("share_expires_at")}
                  />
                )}
              </Field>
              {!form.error("share_expires_at") &&
                (project.share_expired && project.share_expires_at ? (
                  <p className="mt-1.5 text-[13px] text-negative">This link expired {relative(project.share_expires_at)}.</p>
                ) : (
                  !project.share_expires_at && <Hint>Never expires.</Hint>
                ))}
            </div>
          </div>
        </Section>

        <Section
          title="What the client can do"
          description="Limits and permissions inside the gallery."
          summary={
            <ul className="flex flex-wrap gap-1.5">
              <Pill>{project.max_selectable_photos ? `Up to ${project.max_selectable_photos} picks` : "Unlimited picks"}</Pill>
              <Pill tone={project.allow_comments ? "accent" : "neutral"}>{project.allow_comments ? "Comments on" : "Comments off"}</Pill>
              <Pill tone={project.allow_download ? "accent" : "neutral"}>
                {project.allow_download ? "Downloads on" : "Downloads off"}
              </Pill>
            </ul>
          }
        >
          <div>
            <Field label="Maximum photos the client can pick" error={form.error("max_selectable_photos")}>
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
            <div className="mt-3 divide-y divide-line border-t border-line">
              <SwitchRow label="Allow comments" description="Clients can leave notes on individual photos." checked={values.allow_comments} onChange={(v) => form.set("allow_comments", v)} />
              <SwitchRow label="Allow downloads" description="Clients can download photos from the final delivery gallery." checked={values.allow_download} onChange={(v) => form.set("allow_download", v)} />
            </div>
          </div>
        </Section>

        <div className={cn("sticky bottom-4 z-10 flex items-center justify-end gap-3 rounded-card border border-line bg-surface px-4 py-3 shadow-float")}>
          {saved ? <span className="text-sm text-positive">Saved.</span> : <span className="text-[13px] text-muted">Changes apply to the client&rsquo;s gallery immediately.</span>}
          <Button type="submit" variant="primary" loading={busy === "save"}>
            Save settings
          </Button>
        </div>
      </form>
    </div>
  );
}
