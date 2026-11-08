import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/ui/theme-toggle";

/** Guest pages: the product named top-left, one narrow column for the form. */
export function AuthShell({ title, description, children, footer }: { title: string; description?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col px-4 sm:px-8">
      <header className="flex h-16 items-center justify-between">
        <Wordmark href="/login" />
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-start justify-center pb-16 pt-[8vh]">
        <div className="w-full max-w-[400px]">
          <h1 className="text-title font-bold tracking-[-0.02em] text-ink">{title}</h1>
          {description && <p className="mt-2 text-sm text-muted">{description}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 border-t border-line pt-5 text-sm text-muted">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
