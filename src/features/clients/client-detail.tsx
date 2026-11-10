"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mail, MessageCircle, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { BackLink, PageBody } from "@/components/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { useConfirm, useToast } from "@/components/ui/feedback";
import { EmptyState, LoadError } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { count, longDate, number } from "@/lib/format";
import type { ClientShow } from "@/lib/types";
import { useTitle } from "@/lib/use-title";
import { CARD_GRID, CardsSkeleton, ProjectCard } from "@/features/projects/projects-index";
import { ClientFormDialog } from "./client-form-dialog";
import { clientKey, useInvalidateClients } from "./use-clients";

export function ClientDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const invalidate = useInvalidateClients();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const show = useQuery({
    queryKey: clientKey(id),
    queryFn: () => api.get<ClientShow>(`/clients/${id}`),
  });

  useTitle(show.data?.client.name ?? "Client");

  if (show.isPending) {
    return (
      <div className="px-4 pb-10 pt-5 sm:px-6 lg:px-10">
        <Skeleton className="h-[188px] w-full rounded-board" />
        <div className="mt-4 overflow-hidden rounded-board border border-line bg-surface">
          <CardsSkeleton />
        </div>
      </div>
    );
  }

  if (show.isError) {
    const status = show.error instanceof ApiError ? show.error.status : 0;
    return (
      <PageBody>
        <BackLink href="/clients">Clients</BackLink>
        {status === 403 || status === 404 ? (
          <EmptyState title="Client not found" className="mt-6">
            They may have been removed, or they belong to another account.
          </EmptyState>
        ) : (
          <div className="mt-6">
            <LoadError what="this client" onRetry={() => show.refetch()} />
          </div>
        )}
      </PageBody>
    );
  }

  const { client, projects } = show.data;
  const newProjectHref = `/projects/new?client_id=${client.id}`;

  async function destroy() {
    const ok = await confirm({
      title: `Delete ${client.name}?`,
      message: projects.length
        ? `${client.name} still has ${count(projects.length, "project")}. Clients with projects can't be deleted.`
        : "This removes the client from your list. It can't be undone.",
      confirmLabel: "Delete client",
      tone: "danger",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await api.delete(`/clients/${client.id}`);
      invalidate();
      toast(`${client.name} deleted.`);
      router.push("/clients");
    } catch (error) {
      toast(error instanceof ApiError ? error.message : "Couldn't delete the client.", "error");
      setDeleting(false);
    }
  }

  return (
    <div className="px-4 pb-20 pt-5 sm:px-6 lg:px-10">
      {/* The board: who on the left, actions on the right, the facts along the bottom. */}
      <section className="relative overflow-hidden rounded-board border border-line bg-surface">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(var(--rule)_1px,transparent_1px),linear-gradient(90deg,var(--rule)_1px,transparent_1px)] [background-size:44px_44px]"
        />

        <div className="relative flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <nav aria-label="Breadcrumb" className="eyebrow flex items-center gap-1.5">
              <Link href="/clients" className="hover:text-ink">
                Clients
              </Link>
              <span aria-hidden="true">/</span>
              <span>Client</span>
            </nav>
            <h1 className="mt-1.5 truncate text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">{client.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
              {client.email && (
                <a href={`mailto:${client.email}`} className="inline-flex min-w-0 items-center gap-1.5 hover:text-ink hover:underline">
                  <Mail className="size-3.5 shrink-0 text-faint" />
                  <span className="truncate">{client.email}</span>
                </a>
              )}
              {client.phone && (
                <a href={`tel:${client.phone}`} className="inline-flex items-center gap-1.5 hover:text-ink hover:underline">
                  <Phone className="size-3.5 shrink-0 text-faint" />
                  {client.phone}
                </a>
              )}
              {client.whatsapp_url && (
                <a href={client.whatsapp_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-positive hover:underline">
                  <MessageCircle className="size-3.5 shrink-0" />
                  WhatsApp
                </a>
              )}
              {!client.email && !client.phone && <span className="text-faint">No contact details</span>}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <IconAction label="Edit client" onClick={() => setEditing(true)}>
              <Pencil className="size-4" />
            </IconAction>
            <IconAction label="Delete client" onClick={destroy} disabled={deleting}>
              <Trash2 className="size-4" />
            </IconAction>
            <ButtonLink href={newProjectHref} variant="primary" icon={<Plus className="size-4" />}>
              New project for this client
            </ButtonLink>
          </div>
        </div>

        <dl className="relative grid grid-cols-2 gap-px border-t border-rule bg-rule sm:grid-cols-3">
          <Fact label="Projects">{number(client.projects_count)}</Fact>
          <Fact label="Last shoot">{client.last_shoot_date ? longDate(client.last_shoot_date) : "—"}</Fact>
          <Fact label="Client since">{longDate(client.created_at)}</Fact>
        </dl>

        {client.notes && (
          <div className="relative border-t border-rule bg-surface px-5 py-4">
            <p className="eyebrow">Notes</p>
            <p className="mt-1.5 whitespace-pre-line text-[13px] text-ink">{client.notes}</p>
          </div>
        )}
      </section>

      <section className="relative mt-4 overflow-hidden rounded-board border border-line bg-surface">
        <header className="flex items-start justify-between gap-4 border-b border-rule p-5">
          <div className="min-w-0">
            <p className="eyebrow">Projects</p>
            <p className="mt-1 text-sm font-semibold text-ink">Shoots for {client.name}</p>
            <p className="text-xs text-muted">{count(projects.length, "project")} · latest shoot first</p>
          </div>
        </header>

        {projects.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No projects yet"
              action={
                <ButtonLink href={newProjectHref} variant="primary" icon={<Plus className="size-4" />}>
                  New project for this client
                </ButtonLink>
              }
            >
              Book a shoot for {client.name}. Photos can be connected later.
            </EmptyState>
          </div>
        ) : (
          <ul className={CARD_GRID}>
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </ul>
        )}
      </section>

      {editing && <ClientFormDialog client={client} onClose={() => setEditing(false)} onSaved={() => toast("Client saved.")} />}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bg-surface px-5 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm font-medium text-ink tabular">{children}</dd>
    </div>
  );
}

function IconAction({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex size-9 items-center justify-center rounded-control border border-line bg-surface text-muted transition-colors hover:bg-raised hover:text-ink disabled:opacity-50"
    >
      {children}
    </button>
  );
}
