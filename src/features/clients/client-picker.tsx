"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { inputClass } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import { initial } from "@/lib/format";
import type { ClientOption, ClientRef } from "@/lib/types";
import { ClientFormDialog } from "./client-form-dialog";
import { useClientOptions } from "./use-clients";

/**
 * Searchable client picker (a combobox over `GET /clients/all`) with an
 * inline "New client" that creates one and selects it.
 */
export function ClientPicker({
  id,
  value,
  onChange,
  fallback,
  invalid,
  autoFocus,
}: {
  id?: string;
  value: number | "";
  onChange: (id: number | "", client: ClientOption | null) => void;
  /** Shown while the list loads, or if the saved client isn't in it. */
  fallback?: ClientRef | null;
  invalid?: boolean;
  autoFocus?: boolean;
}) {
  const options = useClientOptions();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<ClientOption | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected =
    value === ""
      ? null
      : (options.data?.find((client) => client.id === value) ??
        (created?.id === value ? created : null) ??
        (fallback?.id === value ? fallback : null));

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = options.data ?? [];
    return (term ? list.filter((client) => [client.name, client.email, client.phone].some((field) => field?.toLowerCase().includes(term))) : list).slice(0, 50);
  }, [options.data, search]);

  // The last row is always "New client".
  const rows = matches.length + 1;

  function choose(client: ClientOption) {
    onChange(client.id, client);
    setSearch("");
    setOpen(false);
  }

  function startCreate() {
    setOpen(false);
    setCreating(true);
  }

  function clear() {
    onChange("", null);
    setSearch("");
    setOpen(true);
    setHighlight(0);
    requestAnimationFrame(() => input.current?.focus());
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setHighlight((current) => (current + (event.key === "ArrowDown" ? 1 : rows - 1)) % rows);
    } else if (event.key === "Enter") {
      // Never submit the surrounding form from the search box.
      event.preventDefault();
      if (!open) return setOpen(true);
      if (highlight < matches.length) choose(matches[highlight]);
      else startCreate();
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      {selected ? (
        <div className={cn(inputClass, "flex items-center gap-2.5 ps-1.5 pe-1")} aria-invalid={invalid || undefined}>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-[12px] font-semibold text-ground">{initial(selected.name)}</span>
          <span className="min-w-0 flex-1 truncate">
            <span className="font-medium text-ink">{selected.name}</span>
            {(selected.email || selected.phone) && <span className="ms-2 text-[13px] text-muted">{selected.email ?? selected.phone}</span>}
          </span>
          <button
            id={id}
            type="button"
            onClick={clear}
            className="flex h-8 shrink-0 items-center gap-1 rounded-[8px] px-2 text-[13px] font-medium text-muted hover:bg-raised hover:text-ink"
          >
            <X className="size-3.5" />
            Change
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
            <input
              ref={input}
              id={id}
              type="text"
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={open ? `${listId}-${highlight}` : undefined}
              aria-invalid={invalid || undefined}
              autoFocus={autoFocus}
              autoComplete="off"
              placeholder={value !== "" && options.isPending ? "Loading client…" : "Search clients by name, email or phone"}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setHighlight(0);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setOpen(false)}
              onKeyDown={onKeyDown}
              className={cn(inputClass, "ps-9")}
            />
            {options.isFetching && <Spinner className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-faint" />}
          </div>
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-control border border-control bg-surface px-3 text-sm font-medium text-ink transition-colors hover:bg-raised"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">New client</span>
            <span className="sr-only sm:hidden">New client</span>
          </button>
          </div>

          {open && (
            <ul
              id={listId}
              role="listbox"
              aria-label="Clients"
              // Keep focus in the input while clicking a row.
              onMouseDown={(event) => event.preventDefault()}
              className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-72 overflow-y-auto rounded-card border border-line bg-surface p-1.5 shadow-float"
            >
              {options.isError ? (
                <li className="px-3 py-2.5 text-[13px] text-negative">Couldn&rsquo;t load your clients.</li>
              ) : options.isPending ? (
                <li className="px-3 py-2.5 text-[13px] text-muted">Loading clients…</li>
              ) : matches.length === 0 ? (
                <li className="px-3 py-2.5 text-[13px] text-muted">{search ? "No client matches." : "No clients yet."}</li>
              ) : null}
              {matches.map((client, index) => (
                <li
                  key={client.id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={highlight === index}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => choose(client)}
                  className={cn("flex cursor-pointer items-center gap-2.5 rounded-[10px] px-2 py-2", highlight === index && "bg-raised")}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-active text-[12px] font-semibold text-ink">{initial(client.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{client.name}</span>
                    {(client.email || client.phone) && (
                      <span className="block truncate text-xs text-muted">{[client.email, client.phone].filter(Boolean).join(" · ")}</span>
                    )}
                  </span>
                </li>
              ))}
              <li
                id={`${listId}-${matches.length}`}
                role="option"
                aria-selected={highlight === matches.length}
                onMouseEnter={() => setHighlight(matches.length)}
                onClick={startCreate}
                className={cn(
                  "mt-1 flex cursor-pointer items-center gap-2.5 rounded-[10px] border-t border-rule px-2 py-2 text-sm font-medium text-ink",
                  highlight === matches.length && "bg-raised",
                )}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed border-control text-muted">
                  <Plus className="size-3.5" />
                </span>
                <span className="min-w-0 truncate">New client{search.trim() && ` “${search.trim()}”`}</span>
              </li>
            </ul>
          )}
        </>
      )}

      {creating && (
        <ClientFormDialog
          initialName={search.trim()}
          onClose={() => setCreating(false)}
          onSaved={(client) => {
            const option = { id: client.id, name: client.name, email: client.email, phone: client.phone };
            setCreated(option);
            choose(option);
          }}
        />
      )}
    </div>
  );
}
