import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** A flat white surface with a 1px edge. No shadow at rest. */
export function Panel({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("rounded-card border border-line bg-surface", className)} {...props} />;
}

export function PanelHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-5 pt-5", className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Footer strip for a panel's one Save, on one tone step down. */
export function PanelFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-end gap-3 rounded-b-card border-t border-line bg-ground px-5 py-3", className)}
      {...props}
    />
  );
}

/** Key-value rows inside a panel. */
export function Facts({ rows, className }: { rows: [ReactNode, ReactNode][]; className?: string }) {
  return (
    <dl className={cn("space-y-3 text-sm", className)}>
      {rows.map(([term, value], index) => (
        <div key={index} className="flex items-baseline justify-between gap-4">
          <dt className="text-muted">{term}</dt>
          <dd className="text-end font-medium text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
