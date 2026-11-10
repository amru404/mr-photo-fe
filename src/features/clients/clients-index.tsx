"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm, useToast } from "@/components/ui/feedback";
import { EmptyState, LoadError } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/spinner";
import { RowAction, SortHeader, TABLE_HEAD, type SortState } from "@/components/ui/table";
import { api, ApiError, query } from "@/lib/api";
import { cn } from "@/lib/cn";
import { count, initial, longDate, number } from "@/lib/format";
import type { Client, ClientList } from "@/lib/types";
import { useQueryState } from "@/lib/use-query-state";
import { useTitle } from "@/lib/use-title";
import { Pager } from "@/features/projects/projects-index";
import { ClientFormDialog } from "./client-form-dialog";
import { useInvalidateClients } from "./use-clients";

const COLUMNS = "md:grid-cols-[36px_minmax(0,1.5fr)_minmax(0,1fr)_96px_140px_84px]";

export function ClientsIndex() {
  useTitle("Clients");
  const url = useQueryState();
  const page = Number(url.get("page", "1")) || 1;
  // Name A–Z unless the URL says otherwise.
  const sort: SortState = { sort: url.get("sort", "name"), direction: url.get("direction") === "desc" ? "desc" : "asc" };
  const setSort = (next: SortState) =>
    url.set({ sort: next.sort, direction: next.direction, page: null }, { defaults: { sort: "name", direction: "asc" } });
  const [search, setSearch] = useState(url.get("search"));
  const [debounced, setDebounced] = useState(search);
  const [editing, setEditing] = useState<Client | "new" | null>(null);
  const toast = useToast();

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (debounced !== url.get("search")) url.set({ search: debounced, page: null });
  }, [debounced]);

  const list = useQuery({
    queryKey: ["clients", { search: debounced, page, sort: sort.sort, direction: sort.direction }],
    queryFn: () => api.get<ClientList>(`/clients${query({ search: debounced, sort: sort.sort, direction: sort.direction, page: page > 1 ? page : null })}`),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="px-4 pb-10 pt-5 sm:px-6 lg:px-10">
      {/* Toolbar: search, then the primary action. */}
      <div className="flex items-center justify-end gap-2">
        <label className="relative flex h-[42px] min-w-0 flex-1 items-center rounded-[12px] border border-line bg-surface sm:w-80 sm:flex-none">
          <Search className="pointer-events-none absolute start-3 size-4 text-faint" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email or phone"
            aria-label="Search clients"
            className="size-full rounded-[12px] bg-transparent ps-9 pe-3 text-[13px] text-ink outline-none placeholder:text-faint focus-visible:ring-2 focus-visible:ring-accent-track"
          />
        </label>
        <button
          type="button"
          onClick={() => setEditing("new")}
          aria-label="New client"
          className="inline-flex h-[42px] shrink-0 items-center gap-2 rounded-[12px] bg-primary px-3.5 text-[13px] font-semibold text-on-primary transition-colors hover:bg-primary-hover sm:px-4"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">New client</span>
        </button>
      </div>

      <section className="relative mt-4 overflow-hidden rounded-[20px] border border-line bg-surface">
        <header className="flex items-start justify-between gap-4 border-b border-rule p-5">
          <div className="min-w-0">
            <p className="eyebrow">Clients</p>
            <p className="mt-1 text-sm font-semibold text-ink">Everyone you shoot for</p>
            <p className="truncate text-xs text-muted">
              {list.data ? count(list.data.meta.total, "client") : "Loading…"}
              {debounced && ` matching “${debounced}”`}
            </p>
          </div>
          {debounced && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              title="Clear search"
              className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-line bg-raised text-muted hover:text-ink"
            >
              <X className="size-4" />
            </button>
          )}
        </header>

        {list.isPending ? (
          <RowsSkeleton />
        ) : list.isError ? (
          <div className="p-4">
            <LoadError what="your clients" onRetry={() => list.refetch()} />
          </div>
        ) : list.data.data.length === 0 ? (
          <div className="p-4">
            {debounced ? (
              <EmptyState title="No clients match">Try a different name, email or phone.</EmptyState>
            ) : (
              <EmptyState
                title="No clients yet"
                action={
                  <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEditing("new")}>
                    New client
                  </Button>
                }
              >
                Add the people you shoot for, then book projects for them.
              </EmptyState>
            )}
          </div>
        ) : (
          <>
            <div className={cn(TABLE_HEAD, COLUMNS)}>
              <span />
              <SortHeader label="Client" column="name" state={sort} onSort={setSort} />
              <SortHeader label="Phone" column="phone" state={sort} onSort={setSort} />
              <SortHeader label="Projects" column="projects_count" state={sort} onSort={setSort} firstDirection="desc" />
              <SortHeader label="Last shoot" column="last_shoot_date" state={sort} onSort={setSort} firstDirection="desc" />
              <span>Actions</span>
            </div>
            <ul className="divide-y divide-rule">
              {list.data.data.map((client) => (
                <ClientRow key={client.id} client={client} onEdit={() => setEditing(client)} />
              ))}
            </ul>
            <Pager meta={list.data.meta} onPage={(next) => url.set({ page: next > 1 ? next : null })} />
          </>
        )}
      </section>

      {editing && (
        <ClientFormDialog
          client={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(client) => toast(editing === "new" ? `${client.name} added.` : "Client saved.")}
        />
      )}
    </div>
  );
}

function ClientRow({ client, onEdit }: { client: Client; onEdit: () => void }) {
  const confirm = useConfirm();
  const toast = useToast();
  const invalidate = useInvalidateClients();
  const [deleting, setDeleting] = useState(false);

  async function destroy() {
    const ok = await confirm({
      title: `Delete ${client.name}?`,
      message: client.projects_count
        ? `${client.name} still has ${count(client.projects_count, "project")}. Clients with projects can't be deleted.`
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
    } catch (error) {
      // 422 when the client still has projects: the backend explains why.
      toast(error instanceof ApiError ? error.message : "Couldn't delete the client.", "error");
      setDeleting(false);
    }
  }


  return (
    <li className={cn("group relative grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-4 px-5 py-3 transition-colors hover:bg-raised md:gap-5", COLUMNS, deleting && "opacity-60")}>
      <span className="flex size-9 items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-ground">{initial(client.name)}</span>
      <div className="min-w-0">
        <Link href={`/clients/${client.id}`} className="block truncate text-[13px] font-semibold text-ink after:absolute after:inset-0 after:content-['']">
          {client.name}
        </Link>
        <p className="truncate text-xs text-muted">
          {client.email ?? (client.phone ? <span className="md:hidden">{client.phone}</span> : "No contact details")}
          <span className="md:hidden"> · {count(client.projects_count, "project")}</span>
        </p>
      </div>
      <span className="hidden truncate text-[13px] text-ink md:block">{client.phone ?? <span className="text-faint">—</span>}</span>
      <span className="hidden md:block">
        <span className="inline-block rounded-[8px] bg-raised px-2 py-0.5 font-mono text-xs text-ink tabular group-hover:bg-active">{number(client.projects_count)}</span>
      </span>
      <span className="hidden text-xs text-muted md:block">{client.last_shoot_date ? longDate(client.last_shoot_date) : "—"}</span>
      <span className="flex items-center gap-0.5">
        <RowAction label={`Edit ${client.name}`} onClick={onEdit}>
          <Pencil className="size-4" />
        </RowAction>
        <RowAction label={`Delete ${client.name}`} onClick={destroy} disabled={deleting} danger>
          <Trash2 className="size-4" />
        </RowAction>
      </span>
    </li>
  );
}

function RowsSkeleton() {
  return (
    <ul className="divide-y divide-rule">
      {Array.from({ length: 6 }, (_, index) => (
        <li key={index} className="flex items-center gap-4 px-5 py-3.5">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        </li>
      ))}
    </ul>
  );
}
