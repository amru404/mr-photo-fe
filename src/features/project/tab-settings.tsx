"use client";

import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { useConfirm } from "@/components/ui/feedback";
import { Checkbox, Field, Hint, Input, PasswordInput } from "@/components/ui/field";
import { Pill } from "@/components/ui/pill";
import { SwitchRow } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { longDate, relative } from "@/lib/format";
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
    requires_payment: project.requires_payment,
  };
}

/** Settings row: what it is (and its current value) on the left, the panel on the right. */
function Section({ title, description, summary, children }: { title: string; description: string; summary?: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-line py-8 first:border-t-0 first:pt-0 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-12">
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
        {summary && <div className="mt-4">{summary}</div>}
      </div>
      <div className="min-w-0 max-w-3xl">{children}</div>
    </section>
  );
}

export function SettingsTab({ project }: { project: ProjectDetail }) {
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
    <div>
      <Section
        title="Client link"
        description="Send this link to your client. They don't need an account."
        summary={regenerated && <p className="text-sm font-medium text-positive">New link generated. The old one no longer works.</p>}
      >
        <div className="rounded-card bg-raised p-4">
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

      <form onSubmit={save} noValidate>
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
          <div className="grid gap-5 rounded-card bg-raised p-4 sm:grid-cols-2">
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
                {project.allow_download ? (project.requires_payment ? "Downloads after payment" : "Downloads on") : "Downloads off"}
              </Pill>
            </ul>
          }
        >
          <div className="rounded-card bg-raised p-4">
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
              <SwitchRow
                label="Require payment before download"
                description="Downloads stay locked and previews watermarked until you confirm payment."
                checked={values.requires_payment}
                onChange={(v) => form.set("requires_payment", v)}
              />
            </div>
          </div>
        </Section>

        <div className={cn("sticky bottom-4 z-10 mt-2 flex items-center justify-end gap-3 rounded-card border border-line bg-surface px-4 py-3 shadow-float lg:ms-[388px]")}>
          {saved ? <span className="text-sm text-positive">Saved.</span> : <span className="text-[13px] text-muted">Changes apply to the client&rsquo;s gallery immediately.</span>}
          <Button type="submit" variant="primary" loading={busy === "save"}>
            Save sharing settings
          </Button>
        </div>
      </form>
    </div>
  );
}
