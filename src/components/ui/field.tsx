"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const inputClass =
  "block h-10 w-full rounded-control border border-control bg-surface px-3 text-sm text-ink transition-colors " +
  "hover:border-faint focus:border-accent focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-accent-track " +
  "disabled:cursor-not-allowed disabled:bg-raised disabled:text-muted aria-invalid:border-negative";

export function Label({ htmlFor, children, className }: { htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("block text-sm font-medium text-ink", className)}>
      {children}
    </label>
  );
}

export function FieldError({ message, className }: { message?: string; className?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className={cn("mt-1.5 text-[13px] text-negative", className)}>
      {message}
    </p>
  );
}

export function Hint({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mt-1.5 text-[13px] text-muted", className)}>{children}</p>;
}

interface FieldProps {
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  aside?: ReactNode;
  className?: string;
  children: (id: string) => ReactNode;
}

/** Label above the control, 8px gap, then the error or hint. */
export function Field({ label, error, hint, aside, className, children }: FieldProps) {
  const id = useId();
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {aside}
      </div>
      <div className="mt-2">{children(id)}</div>
      {error ? <FieldError message={error} /> : hint ? <Hint>{hint}</Hint> : null}
    </div>
  );
}

export function Input({ className, invalid, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={cn(inputClass, className)} aria-invalid={invalid || undefined} {...props} />;
}

export function Textarea({ className, invalid, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn(inputClass, "h-auto resize-none py-2.5", className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

/** Password or PIN with a Show / Hide switch inside the field. */
export function PasswordInput({ className, invalid, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input
        type={shown ? "text" : "password"}
        className={cn(inputClass, "pe-16", className)}
        aria-invalid={invalid || undefined}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShown((value) => !value)}
        disabled={props.disabled}
        className="absolute inset-y-0 end-0 px-3 text-xs font-medium text-muted hover:text-ink disabled:opacity-50"
      >
        {shown ? "Hide" : "Show"}
      </button>
    </div>
  );
}

export function Checkbox({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2 text-sm text-muted", className)}>
      <input type="checkbox" className="size-4 rounded-chip border-control accent-[var(--primary)]" {...props} />
      {label}
    </label>
  );
}
