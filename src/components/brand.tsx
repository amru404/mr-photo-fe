import Link from "next/link";
import { cn } from "@/lib/cn";
import { APP_NAME } from "@/lib/config";

/** The product mark: a frame on a strip of film, the picked one lit by the safelight. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6", className)} aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="6" className="fill-ink" />
      <rect x="5.5" y="6.5" width="13" height="11" rx="1.5" className="fill-accent" />
      <g className="fill-ground">
        <rect x="5.5" y="3" width="2" height="1.8" rx=".4" />
        <rect x="11" y="3" width="2" height="1.8" rx=".4" />
        <rect x="16.5" y="3" width="2" height="1.8" rx=".4" />
        <rect x="5.5" y="19.2" width="2" height="1.8" rx=".4" />
        <rect x="11" y="19.2" width="2" height="1.8" rx=".4" />
        <rect x="16.5" y="19.2" width="2" height="1.8" rx=".4" />
      </g>
    </svg>
  );
}

export function Wordmark({ href = "/dashboard", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 font-semibold text-ink", className)}>
      <Mark />
      <span className="truncate text-[15px] tracking-[-0.015em]">{APP_NAME}</span>
    </Link>
  );
}

const INITIAL_SIZES = {
  sm: "size-8 text-[13px]",
  md: "size-9 text-sm",
  lg: "size-14 text-xl",
} as const;

/**
 * The photographer's brand on client pages: their initial in the accent, or
 * (tone="ink") in an ink circle like the account avatar of the app bar.
 */
export function BrandInitial({
  name,
  className,
  tone = "accent",
  size = "md",
}: {
  name: string;
  className?: string;
  tone?: "accent" | "ink";
  size?: keyof typeof INITIAL_SIZES;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        INITIAL_SIZES[size],
        tone === "ink" ? "bg-ink text-ground" : "bg-accent text-on-accent",
        className,
      )}
    >
      {name.trim().charAt(0).toUpperCase() || "·"}
    </span>
  );
}
