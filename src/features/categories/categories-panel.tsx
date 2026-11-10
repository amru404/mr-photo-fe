"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ListChecks, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { useConfirm, useToast } from "@/components/ui/feedback";
import { FieldError, Input } from "@/components/ui/field";
import { LoadError } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { count } from "@/lib/format";
import type { Category } from "@/lib/types";

/** The user's project categories: add inline, rename in place, delete with a confirm. */
export function CategoriesPanel() {
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [adding, setAdding] = useState(false);

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get<{ data: Category[] }>("/categories")).data,
  });

  // The wizard's category select reads ["options"] (useOptions); project cards show the names.
  const refresh = () => {
    client.invalidateQueries({ queryKey: ["categories"] });
    client.invalidateQueries({ queryKey: ["options"] });
    client.invalidateQueries({ queryKey: ["projects"] });
    client.invalidateQueries({ queryKey: ["project"] });
  };

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setAdding(true);
    setError(undefined);
    try {
      await api.post("/categories", { name: name.trim() });
      setName("");
      refresh();
    } catch (failure) {
      setError(failure instanceof ApiError ? (failure.field("name") ?? failure.message) : "Couldn't add the category.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div>
      <form onSubmit={add} noValidate className="border-b border-rule p-5">
        <div className="flex items-center gap-2">
          <Input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(undefined);
            }}
            placeholder="New category, e.g. Maternity"
            aria-label="New category name"
            maxLength={100}
            invalid={!!error}
          />
          <Button type="submit" variant="primary" loading={adding} disabled={!name.trim()} icon={<Plus className="size-4" />}>
            Add
          </Button>
        </div>
        <FieldError message={error} />
      </form>

      {categories.isPending ? (
        <div className="space-y-3 p-5">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-5 w-full" />
          ))}
        </div>
      ) : categories.isError ? (
        <div className="p-4">
          <LoadError what="your categories" onRetry={() => categories.refetch()} />
        </div>
      ) : categories.data.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-muted">No categories yet. Add one above.</p>
      ) : (
        <ul className="divide-y divide-rule">
          {categories.data.map((category) => (
            <CategoryRow key={category.id} category={category} onChanged={refresh} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryRow({ category, onChanged }: { category: Category; onChanged: () => void }) {
  const confirm = useConfirm();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);

  function cancel() {
    setEditing(false);
    setName(category.name);
    setError(undefined);
  }

  async function save() {
    if (name.trim() === category.name) return cancel();
    setBusy("save");
    setError(undefined);
    try {
      await api.patch(`/categories/${category.id}`, { name: name.trim() });
      setEditing(false);
      onChanged();
    } catch (failure) {
      setError(failure instanceof ApiError ? (failure.field("name") ?? failure.message) : "Couldn't rename the category.");
    } finally {
      setBusy(null);
    }
  }

  async function destroy() {
    const ok = await confirm({
      title: `Delete “${category.name}”?`,
      message: category.projects_count
        ? `${count(category.projects_count, "project")} will keep working, just without a category.`
        : "No projects use this category.",
      confirmLabel: "Delete category",
      tone: "danger",
    });
    if (!ok) return;
    setBusy("delete");
    try {
      await api.delete(`/categories/${category.id}`);
      onChanged();
    } catch (failure) {
      toast(failure instanceof ApiError ? failure.message : "Couldn't delete the category.", "error");
      setBusy(null);
    }
  }

  const icon = "flex size-8 shrink-0 items-center justify-center rounded-[8px] text-muted transition-colors hover:bg-raised disabled:opacity-50";

  if (editing) {
    return (
      <li className="px-5 py-3">
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={name}
            maxLength={100}
            aria-label={`Rename ${category.name}`}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                save();
              } else if (event.key === "Escape") {
                event.preventDefault();
                cancel();
              }
            }}
            invalid={!!error}
          />
          <button type="button" onClick={save} disabled={busy === "save" || !name.trim()} aria-label="Save name" title="Save" className={cn(icon, "hover:text-ink")}>
            <Check className="size-4" />
          </button>
          <button type="button" onClick={cancel} aria-label="Cancel rename" title="Cancel" className={cn(icon, "hover:text-ink")}>
            <X className="size-4" />
          </button>
        </div>
        <FieldError message={error} />
      </li>
    );
  }

  return (
    <li className={cn("flex items-center gap-3 px-5 py-2.5", busy === "delete" && "opacity-60")}>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{category.name}</span>
        <span className="block truncate text-xs text-muted">
          <span className="sm:hidden">{count(category.projects_count, "project")} · </span>
          Form: {count(category.fields_count ?? 0, "question")} · {category.deposit_percent ?? 50}% DP
        </span>
      </span>
      <span className="hidden shrink-0 rounded-[8px] bg-raised px-2.5 py-1 font-mono text-xs text-muted tabular sm:inline">{count(category.projects_count, "project")}</span>
      <ButtonLink
        href={`/categories/${category.id}/form`}
        size="sm"
        aria-label={`Edit the booking form for ${category.name}`}
        icon={<ListChecks className="size-4" />}
      >
        <span className="hidden sm:inline">Edit form</span>
      </ButtonLink>
      <span className="flex shrink-0 gap-0.5">
        <button type="button" onClick={() => setEditing(true)} aria-label={`Rename ${category.name}`} title="Rename" className={cn(icon, "hover:text-ink")}>
          <Pencil className="size-4" />
        </button>
        <button type="button" onClick={destroy} disabled={busy === "delete"} aria-label={`Delete ${category.name}`} title="Delete" className={cn(icon, "hover:text-negative")}>
          <Trash2 className="size-4" />
        </button>
      </span>
    </li>
  );
}
