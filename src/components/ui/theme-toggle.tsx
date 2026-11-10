"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/cn";

/** Sliding light/dark switch for the top bar: sun on the left, moon on the right. */
export function ThemeSwitch({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={cn(
        "relative h-5 w-9 shrink-0 items-center rounded-full border border-line p-px transition-colors",
        dark ? "bg-ink" : "bg-raised",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-4 items-center justify-center rounded-full bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.2)] transition-transform",
          dark ? "translate-x-4 text-ink" : "translate-x-0 text-amber-500",
        )}
      >
        {dark ? <Moon className="size-2.5" /> : <Sun className="size-2.5" />}
      </span>
    </button>
  );
}

/** Light is the default; the choice is remembered per browser. */
export function ThemeToggle({ className, withLabel = false }: { className?: string; withLabel?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dark = mounted && resolvedTheme === "dark";
  const label = dark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center gap-2 rounded-control text-muted transition-colors hover:bg-raised hover:text-ink",
        withLabel ? "h-8 px-2 text-sm" : "size-9 justify-center",
        className,
      )}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      {withLabel && <span>{dark ? "Light mode" : "Dark mode"}</span>}
    </button>
  );
}
