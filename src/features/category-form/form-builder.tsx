"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type DragEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CopyPlus, Eye, GripVertical, Heading, ListChecks, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm, useToast } from "@/components/ui/feedback";
import { FieldError } from "@/components/ui/field";
import { EmptyState, LoadError, Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { count } from "@/lib/format";
import type { Category } from "@/lib/types";
import { useTitle } from "@/lib/use-title";
import { type FieldType, type FormField, type FormSchema } from "@/features/booking-form/schema";
import { Popover, TypeMenu } from "./controls";
import {
  blankField,
  brokenRules,
  cleanForm,
  duplicateField,
  mapServerErrors,
  MAX_FIELDS,
  moveItem,
  validateLocally,
  withType,
  type CardErrors,
} from "./model";
import { FormPreview } from "./preview";
import { QuestionCard } from "./question-card";

interface CategoryForm {
  category: { id: number; name: string; deposit_percent: number };
  form: FormSchema;
}

const GRID_BACKGROUND =
  "pointer-events-none absolute inset-0 rounded-board opacity-60 [background-image:linear-gradient(var(--rule)_1px,transparent_1px),linear-gradient(90deg,var(--rule)_1px,transparent_1px)] [background-size:44px_44px]";

const BASE_FIELDS = ["Name", "Email", "Phone", "Date", "Time", "Location", "Category"];

const fieldsOf = (data: CategoryForm) => data.form?.fields ?? [];
const depositOf = (data: CategoryForm) => data.category.deposit_percent ?? 50;
const fingerprint = (fields: FormField[], deposit: number) => JSON.stringify([cleanForm(fields), deposit]);

/** /categories/{id}/form: one category's booking questions, built like a Google Form. */
export function CategoryFormScreen({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ["category-form", id],
    queryFn: () => api.get<CategoryForm>(`/categories/${id}/form`),
  });
  useTitle(query.data ? `${query.data.category.name} booking form` : "Booking form");

  if (query.isPending) {
    return (
      <div className="px-4 pb-10 pt-5 sm:px-6 lg:px-10">
        <Skeleton className="h-[220px] w-full rounded-board" />
        <div className="mx-auto mt-4 max-w-3xl space-y-3">
          <Skeleton className="h-28 rounded-card" />
          <Skeleton className="h-16 rounded-card" />
          <Skeleton className="h-16 rounded-card" />
        </div>
      </div>
    );
  }

  if (query.isError) {
    const status = query.error instanceof ApiError ? query.error.status : 0;
    return (
      <div className="px-4 pb-10 pt-5 sm:px-6 lg:px-10">
        {status === 403 || status === 404 ? (
          <EmptyState title="Category not found">It may have been deleted, or it belongs to another account.</EmptyState>
        ) : (
          <LoadError what="this form" onRetry={() => query.refetch()} />
        )}
      </div>
    );
  }

  return <Builder key={query.data.category.id} initial={query.data} queryId={id} />;
}

function Builder({ initial, queryId }: { initial: CategoryForm; queryId: string }) {
  const client = useQueryClient();
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();

  const [category, setCategory] = useState(initial.category);
  const [fields, setFields] = useState<FormField[]>(() => fieldsOf(initial));
  const [deposit, setDeposit] = useState(() => depositOf(initial));
  const [saved, setSaved] = useState(() => fingerprint(fieldsOf(initial), depositOf(initial)));
  const [activeId, setActiveId] = useState<string | null>(() => fieldsOf(initial)[0]?.id ?? null);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [scrollTo, setScrollTo] = useState<string | null>(null);
  const [errors, setErrors] = useState<CardErrors>({});
  const [depositError, setDepositError] = useState<string>();
  const [general, setGeneral] = useState<string[]>([]);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState<"save" | "copy" | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);

  const dirty = useMemo(() => fingerprint(fields, deposit) !== saved, [fields, deposit, saved]);
  const cleaned = useMemo(() => cleanForm(fields), [fields]);
  const questions = fields.filter((field) => field.type !== "section").length;
  const sections = fields.length - questions;
  const full = fields.length >= MAX_FIELDS;

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get<{ data: Category[] }>("/categories")).data,
  });
  const others = (categories.data ?? []).filter((item) => item.id !== category.id);

  // Leaving with unsaved changes: the browser asks (reload, close, external links).
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (!scrollTo) return;
    document.getElementById(`q-${scrollTo}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    setScrollTo(null);
  }, [scrollTo]);

  // --- State helpers ---------------------------------------------------------

  function clearErrors(id: string) {
    setErrors((current) => {
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function load(data: CategoryForm) {
    const nextFields = fieldsOf(data);
    setCategory(data.category);
    setFields(nextFields);
    setDeposit(depositOf(data));
    setSaved(fingerprint(nextFields, depositOf(data)));
    setErrors({});
    setDepositError(undefined);
    setGeneral([]);
    setActiveId((current) => (current && nextFields.some((field) => field.id === current) ? current : (nextFields[0]?.id ?? null)));
    client.setQueryData(["category-form", queryId], data);
    client.invalidateQueries({ queryKey: ["categories"] });
  }

  function activate(id: string) {
    setActiveId(id);
    setScrollTo(id);
  }

  function update(id: string, change: (field: FormField) => FormField) {
    setFields((list) => list.map((field) => (field.id === id ? change(field) : field)));
    clearErrors(id);
  }

  function setPaymentProof(id: string, on: boolean) {
    setFields((list) =>
      list.map((field) => (field.id === id ? { ...field, is_payment_proof: on } : on && field.is_payment_proof ? { ...field, is_payment_proof: false } : field)),
    );
    clearErrors(id);
  }

  function insert(at: number, type: FieldType) {
    if (full) return toast(`A form can have up to ${MAX_FIELDS} questions and sections.`, "error");
    const field = blankField(type);
    setFields((list) => [...list.slice(0, at), field, ...list.slice(at)]);
    setFreshId(field.id);
    activate(field.id);
  }

  function duplicate(id: string) {
    if (full) return;
    const at = fields.findIndex((field) => field.id === id);
    if (at === -1) return;
    const copy = duplicateField(fields[at]);
    setFields((list) => [...list.slice(0, at + 1), copy, ...list.slice(at + 1)]);
    activate(copy.id);
  }

  async function remove(id: string) {
    const at = fields.findIndex((field) => field.id === id);
    if (at === -1) return;
    const dependents = fields.filter((field) => field.show_if?.rules.some((rule) => rule.field === id)).length;
    if (dependents > 0) {
      const ok = await confirm({
        title: "Delete this question?",
        message: `${count(dependents, "other question")} ${dependents === 1 ? "uses" : "use"} it in ${dependents === 1 ? "its" : "their"} conditions. Those conditions will stop working and are removed when you save.`,
        confirmLabel: "Delete question",
        tone: "danger",
      });
      if (!ok) return;
    }
    const next = fields.filter((field) => field.id !== id);
    setFields(next);
    clearErrors(id);
    if (activeId === id) setActiveId(next[Math.min(at, next.length - 1)]?.id ?? null);
  }

  function move(id: string, delta: -1 | 1) {
    const at = fields.findIndex((field) => field.id === id);
    setFields((list) => moveItem(list, at, at + delta));
    setScrollTo(id);
  }

  // --- Drag and drop (grip handle; up/down are the fallback) ------------------

  function dragOverCard(event: DragEvent<HTMLDivElement>, index: number) {
    if (!dragId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const rect = event.currentTarget.getBoundingClientRect();
    setDropAt(event.clientY < rect.top + rect.height / 2 ? index : index + 1);
  }

  function dragOverGap(event: DragEvent<HTMLDivElement>, index: number) {
    if (!dragId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropAt(index);
  }

  function drop(event: DragEvent) {
    if (!dragId) return;
    event.preventDefault();
    const from = fields.findIndex((field) => field.id === dragId);
    if (from !== -1 && dropAt !== null) {
      const to = dropAt > from ? dropAt - 1 : dropAt;
      setFields((list) => moveItem(list, from, to));
    }
    endDrag();
  }

  function endDrag() {
    setDragId(null);
    setDropAt(null);
  }

  // --- Server -----------------------------------------------------------------

  function showFirstError(cards: CardErrors) {
    const first = fields.find((field) => cards[field.id]);
    if (first) {
      setPreview(false);
      activate(first.id);
    }
  }

  async function save() {
    const local = validateLocally(fields);
    if (Object.keys(local).length > 0) {
      setErrors(local);
      showFirstError(local);
      toast(Object.keys(local).length === 1 ? "One question needs fixing." : `${Object.keys(local).length} questions need fixing.`, "error");
      return;
    }
    const dropped = fields.reduce((total, field, index) => total + brokenRules(field, index, fields).length, 0);
    const form = cleanForm(fields);
    setBusy("save");
    setGeneral([]);
    setDepositError(undefined);
    try {
      const data = await api.put<CategoryForm>(`/categories/${category.id}/form`, { form, deposit_percent: deposit });
      load(data);
      toast(dropped > 0 ? `Form saved. ${count(dropped, "broken condition")} removed.` : "Form saved.");
    } catch (failure) {
      if (failure instanceof ApiError && failure.isValidation) {
        const mapped = mapServerErrors(failure.errors, form.fields);
        setErrors(mapped.cards);
        setDepositError(mapped.deposit);
        setGeneral(mapped.general);
        showFirstError(mapped.cards);
        toast(Object.keys(mapped.cards).length > 0 ? "Some questions need fixing." : failure.message, "error");
      } else {
        toast(failure instanceof ApiError ? failure.message : "Couldn't save the form.", "error");
      }
    } finally {
      setBusy(null);
    }
  }

  async function copyFrom(source: Category) {
    const ok = await confirm({
      title: `Copy the questions from “${source.name}”?`,
      message: (
        <>
          {fields.length > 0
            ? `They replace the ${count(questions, "question")} on this form${dirty ? ", and your unsaved changes are lost" : ""}.`
            : "They're added to this form."}{" "}
          The down payment for {category.name} stays as saved.
        </>
      ),
      confirmLabel: "Copy questions",
      tone: fields.length > 0 ? "danger" : "primary",
    });
    if (!ok) return;
    setBusy("copy");
    try {
      const data = await api.post<CategoryForm>(`/categories/${category.id}/form/copy`, { from_category_id: source.id });
      load(data);
      setPreview(false);
      toast(`Copied ${count(fieldsOf(data).filter((field) => field.type !== "section").length, "question")} from ${source.name}.`);
    } catch (failure) {
      toast(failure instanceof ApiError ? failure.message : "Couldn't copy the questions.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function discard() {
    const ok = await confirm({ title: "Discard your changes?", message: "The form goes back to how it was last saved.", confirmLabel: "Discard changes", tone: "danger" });
    if (!ok) return;
    const data = client.getQueryData<CategoryForm>(["category-form", queryId]) ?? initial;
    load(data);
  }

  /** In-app links can't be caught by beforeunload, so they ask here. */
  async function leave(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (!dirty || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    const ok = await confirm({ title: "Leave without saving?", message: "Your changes to this form will be lost.", confirmLabel: "Leave", tone: "danger" });
    if (ok) router.push(href);
  }

  // --- Render -----------------------------------------------------------------

  const dragFrom = dragId ? fields.findIndex((field) => field.id === dragId) : -1;
  /** The drop line, except where dropping wouldn't move anything. */
  const dropping = (gap: number) => dragFrom !== -1 && dropAt === gap && gap !== dragFrom && gap !== dragFrom + 1;

  const sectionSize = (index: number) => {
    let size = 0;
    for (let i = index + 1; i < fields.length && fields[i].type !== "section"; i++) size++;
    return size;
  };

  return (
    <div className={cn("px-4 pt-5 sm:px-6 lg:px-10", dirty ? "pb-28" : "pb-10")}>
      {/* The board: where this form lives, its title, the deposit and the actions. */}
      <section className="relative rounded-board border border-line bg-surface">
        <div aria-hidden="true" className={GRID_BACKGROUND} />
        <div className="relative flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <nav aria-label="Breadcrumb" className="eyebrow flex min-w-0 items-center gap-1.5">
              <Link href="/profile" onClick={(event) => leave(event, "/profile")} className="hover:text-ink">
                Profile
              </Link>
              <span aria-hidden="true">/</span>
              <Link href="/profile" onClick={(event) => leave(event, "/profile")} className="hover:text-ink">
                Categories
              </Link>
              <span aria-hidden="true">/</span>
              <span className="truncate">{category.name}</span>
            </nav>
            <h1 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">{category.name} booking form</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
              <span>
                {count(questions, "question")}
                {sections > 0 && ` in ${count(sections, "section")}`} · DP {deposit}%
              </span>
              {dirty && (
                <span className="inline-flex items-center gap-1.5 text-ink">
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-ink" />
                  Unsaved changes
                </span>
              )}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <Popover
              align="end"
              trigger={({ open, toggle }) => (
                <Button size="sm" onClick={toggle} aria-expanded={open} aria-haspopup="menu" loading={busy === "copy"} icon={<CopyPlus className="size-4" />}>
                  Copy from…
                </Button>
              )}
            >
              {(close) => <CopyMenu categories={others} loading={categories.isPending} onPick={(source) => {
                    close();
                    copyFrom(source);
                  }} />}
            </Popover>
            <Button
              size="sm"
              variant={preview ? "primary" : "secondary"}
              aria-pressed={preview}
              onClick={() => setPreview((value) => !value)}
              icon={preview ? <Pencil className="size-4" /> : <Eye className="size-4" />}
            >
              {preview ? "Edit" : "Preview"}
            </Button>
            <Button size="sm" variant="primary" onClick={save} loading={busy === "save"} disabled={!dirty || busy !== null}>
              Save
            </Button>
          </div>
        </div>

        <DepositControl
          value={deposit}
          error={depositError}
          onChange={(value) => {
            setDeposit(value);
            setDepositError(undefined);
          }}
        />
      </section>

      <div className="mx-auto mt-4 max-w-3xl space-y-3">
        {general.length > 0 && (
          <Notice tone="error">
            {general.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </Notice>
        )}

        {preview ? (
          <FormPreview form={cleaned} name={`${category.name} booking form`} />
        ) : (
          <>
            <BaseNote name={category.name} />

            {fields.length === 0 ? (
              <div className="rounded-card border border-dashed border-control px-6 py-10 text-center">
                <ListChecks className="mx-auto size-6 text-faint" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-ink">No questions yet</p>
                <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted">Add questions clients answer when they book {category.name}, or copy them from another category.</p>
              </div>
            ) : (
              <div onDragOver={(event) => dragId && event.preventDefault()} onDrop={drop}>
                {fields.map((field, index) => (
                  <div key={field.id}>
                    <Gap
                      at={index}
                      shown={field.id === activeId || fields[index - 1]?.id === activeId}
                      dropping={dropping(index)}
                      disabled={full}
                      onPick={(type) => insert(index, type)}
                      onDragOver={(event) => dragOverGap(event, index)}
                    />
                    <div onDragOver={(event) => dragOverCard(event, index)} className={cn("transition-opacity", dragId === field.id && "opacity-40")}>
                      <QuestionCard
                        field={field}
                        index={index}
                        fields={fields}
                        active={field.id === activeId}
                        autoFocus={field.id === freshId}
                        errors={errors[field.id] ?? {}}
                        sectionSize={field.type === "section" ? sectionSize(index) : 0}
                        canDuplicate={!full}
                        dragHandle={<DragHandle id={field.id} onStart={() => setDragId(field.id)} onEnd={endDrag} />}
                        onActivate={() => activate(field.id)}
                        onChange={(patch) => update(field.id, (current) => ({ ...current, ...patch }))}
                        onType={(type) => update(field.id, (current) => withType(current, type))}
                        onPaymentProof={(on) => setPaymentProof(field.id, on)}
                        onDuplicate={() => duplicate(field.id)}
                        onDelete={() => remove(field.id)}
                        onMove={(delta) => move(field.id, delta)}
                      />
                    </div>
                  </div>
                ))}
                <Gap
                  at={fields.length}
                  shown={fields[fields.length - 1]?.id === activeId}
                  dropping={dropping(fields.length)}
                  disabled={full}
                  onPick={(type) => insert(fields.length, type)}
                  onDragOver={(event) => dragOverGap(event, fields.length)}
                />
              </div>
            )}

            <AddBar disabled={full} onPick={(type) => insert(fields.length, type)} />
            {full && <p className="text-center text-xs text-faint">A form can have up to {MAX_FIELDS} questions and sections.</p>}
          </>
        )}
      </div>

      {/* Unsaved changes stay in reach while scrolling a long form. */}
      {dirty && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
            <span className="inline-flex min-w-0 items-center gap-2 text-sm text-ink">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-ink" />
              <span className="truncate">Unsaved changes</span>
            </span>
            <span className="flex shrink-0 gap-1.5">
              <Button size="sm" variant="ghost" onClick={discard} disabled={busy !== null}>
                Discard
              </Button>
              <Button size="sm" variant="primary" onClick={save} loading={busy === "save"} disabled={busy !== null}>
                Save
              </Button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/** "Required down payment": a slider plus an exact number, 0–100. */
function DepositControl({ value, onChange, error }: { value: number; onChange: (value: number) => void; error?: string }) {
  const set = (raw: number) => onChange(Math.max(0, Math.min(100, Math.round(Number.isFinite(raw) ? raw : 0))));
  return (
    <div className="relative border-t border-rule px-5 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-8">
        <div className="min-w-0 md:w-80 md:shrink-0">
          <label htmlFor="deposit-percent" className="block text-sm font-medium text-ink">
            Required down payment
          </label>
          <p className="mt-0.5 text-[13px] text-muted">Shown to clients on this form. Accepting a request with a payment proof records this much as paid.</p>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={value}
            onChange={(event) => set(Number(event.target.value))}
            aria-label="Required down payment"
            aria-valuetext={`${value}%`}
            className="payment-range min-w-0 flex-1"
            style={{ "--fill": `${value}%` } as React.CSSProperties}
          />
          <div className="relative w-24 shrink-0">
            <input
              id="deposit-percent"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              value={value}
              onChange={(event) => set(event.target.value === "" ? 0 : Number(event.target.value))}
              aria-invalid={!!error || undefined}
              className="block h-10 w-full rounded-control border border-control bg-surface pe-8 ps-3 font-mono text-sm text-ink tabular transition-colors hover:border-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-track aria-invalid:border-negative"
            />
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 end-3 flex items-center font-mono text-sm text-muted">
              %
            </span>
          </div>
        </div>
      </div>
      <FieldError message={error} />
    </div>
  );
}

function BaseNote({ name }: { name: string }) {
  return (
    <section className="rounded-card border border-line bg-surface p-4 sm:p-5">
      <h2 className="deck-title">Always asked first</h2>
      <p className="mt-1 text-[13px] text-muted">
        Every booking asks for these, so they aren&rsquo;t part of this form. Your questions below show once a client picks {name}.
      </p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {BASE_FIELDS.map((label) => (
          <li key={label} className="rounded-chip bg-raised px-2 py-1 text-xs text-muted">
            {label}
          </li>
        ))}
      </ul>
    </section>
  );
}

function DragHandle({ id, onStart, onEnd }: { id: string; onStart: () => void; onEnd: () => void }) {
  return (
    <span
      draggable
      aria-hidden="true"
      title="Drag to reorder"
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", id);
        const card = document.getElementById(`q-${id}`);
        if (card) event.dataTransfer.setDragImage(card, 24, 24);
        onStart();
      }}
      onDragEnd={onEnd}
      className="flex size-9 shrink-0 cursor-grab items-center justify-center rounded-control text-faint transition-colors hover:bg-raised hover:text-ink active:cursor-grabbing"
    >
      <GripVertical className="size-4" />
    </span>
  );
}

/** The space between two cards: a "+" (shown next to the active card, else on hover) or the drop line. */
function Gap({
  at,
  shown,
  dropping,
  disabled,
  onPick,
  onDragOver,
}: {
  at: number;
  shown: boolean;
  dropping: boolean;
  disabled: boolean;
  onPick: (type: FieldType) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
}) {
  return (
    <div onDragOver={onDragOver} className="group relative flex h-9 items-center justify-center">
      {dropping ? (
        <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-ink" />
      ) : (
        <Popover
          align="center"
          trigger={({ open, toggle }) => (
            <button
              type="button"
              onClick={toggle}
              disabled={disabled}
              aria-label={`Add a question at position ${at + 1}`}
              aria-haspopup="menu"
              aria-expanded={open}
              className={cn(
                "flex size-7 items-center justify-center rounded-full border border-line bg-surface text-muted transition hover:border-control hover:text-ink focus-visible:opacity-100 disabled:hidden",
                shown || open ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
            >
              <Plus className="size-4" />
            </button>
          )}
        >
          {(close) => (
            <TypeMenu
              withSection
              onPick={(type) => {
                close();
                onPick(type);
              }}
            />
          )}
        </Popover>
      )}
    </div>
  );
}

/** At the end of the list: add a question (pick its type) or a section. */
function AddBar({ disabled, onPick }: { disabled: boolean; onPick: (type: FieldType) => void }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-card border border-dashed border-control p-1.5 sm:flex-row">
      <Popover
        className="flex-1"
        trigger={({ open, toggle }) => (
          <button
            type="button"
            onClick={toggle}
            disabled={disabled}
            aria-haspopup="menu"
            aria-expanded={open}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-control text-sm font-medium text-ink transition-colors hover:bg-raised disabled:opacity-50"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add question
          </button>
        )}
      >
        {(close) => (
          <TypeMenu
            onPick={(type) => {
              close();
              onPick(type);
            }}
          />
        )}
      </Popover>
      <button
        type="button"
        onClick={() => onPick("section")}
        disabled={disabled}
        className="flex h-11 flex-1 items-center justify-center gap-2 rounded-control text-sm font-medium text-ink transition-colors hover:bg-raised disabled:opacity-50"
      >
        <Heading className="size-4" aria-hidden="true" />
        Add section
      </button>
    </div>
  );
}

function CopyMenu({ categories, loading, onPick }: { categories: Category[]; loading: boolean; onPick: (category: Category) => void }) {
  return (
    <div role="menu" aria-label="Copy questions from" className="w-[min(calc(100vw-2rem),300px)]">
      <p className="px-2.5 pb-1.5 pt-1 text-xs text-muted">Copy the questions from another category</p>
      {loading ? (
        <p className="px-2.5 py-2 text-sm text-muted">Loading…</p>
      ) : categories.length === 0 ? (
        <p className="px-2.5 py-2 text-sm text-muted">No other categories yet.</p>
      ) : (
        <div className="max-h-72 overflow-y-auto">
          {categories.map((category) => {
            const size = category.fields_count ?? 0;
            return (
              <button
                key={category.id}
                type="button"
                role="menuitem"
                disabled={size === 0}
                onClick={() => onPick(category)}
                className="flex h-9 w-full items-center gap-3 rounded-control px-2.5 text-start text-sm text-ink transition-colors hover:bg-raised disabled:pointer-events-none disabled:text-faint"
              >
                <span className="min-w-0 flex-1 truncate">{category.name}</span>
                <span className="shrink-0 font-mono text-[11px] text-faint tabular">{size === 0 ? "Empty" : count(size, "question")}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
