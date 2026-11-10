"use client";

import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { writeClipboard } from "./copy-button";

export type SortDirection = "asc" | "desc";

export interface SortState {
  sort: string;
  direction: SortDirection;
}

/** The header row of a grid table: small, faint, every cell left-aligned. */
export const TABLE_HEAD = "hidden items-center gap-5 border-b border-rule bg-ground/40 px-5 py-2 text-xs font-semibold text-faint md:grid";

/**
 * A sortable column heading. Clicking the active column flips the direction;
 * clicking another starts it ascending (or `firstDirection`).
 */
export function SortHeader({
  label,
  column,
  state,
  onSort,
  firstDirection = "asc",
}: {
  label: string;
  column: string;
  state: SortState;
  onSort: (next: SortState) => void;
  firstDirection?: SortDirection;
}) {
  const active = state.sort === column;
  const Icon = !active ? ArrowUpDown : state.direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSort({ sort: column, direction: active ? (state.direction === "asc" ? "desc" : "asc") : firstDirection })}
      aria-label={`Sort by ${label}${active ? (state.direction === "asc" ? ", ascending" : ", descending") : ""}`}
      className={cn(
        "-mx-1.5 inline-flex h-7 items-center gap-1.5 justify-self-start rounded-[6px] px-1.5 transition-colors hover:bg-raised hover:text-ink",
        active && "text-ink",
      )}
    >
      {label}
      <Icon className={cn("size-3", !active && "opacity-50")} aria-hidden="true" />
    </button>
  );
}

/** A small square icon action inside a table row; sits above a row-wide link. */
export function RowAction({
  label,
  onClick,
  href,
  danger,
  disabled,
  children,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  const className = cn(
    "relative z-10 flex size-8 items-center justify-center rounded-[8px] text-muted transition-colors hover:bg-active disabled:opacity-50",
    danger ? "hover:text-negative" : "hover:text-ink",
  );
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className={className}>
      {children}
    </a>
  ) : (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className={className}>
      {children}
    </button>
  );
}

/** Row action that copies text and shows a check for a moment. */
export function CopyRowAction({ text, label, children }: { text: string; label: string; children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  return (
    <RowAction
      label={copied ? "Copied" : label}
      onClick={async () => {
        await writeClipboard(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="size-4 text-positive" strokeWidth={2.5} /> : children}
    </RowAction>
  );
}
