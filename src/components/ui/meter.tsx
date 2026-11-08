import { cn } from "@/lib/cn";

/** A thin track whose fill is the true ratio. No stub at zero. */
export function Meter({
  value,
  max,
  tone = "accent",
  className,
  label,
}: {
  value: number;
  max: number;
  tone?: "accent" | "warning" | "ink";
  className?: string;
  label?: string;
}) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
      className={cn("h-1.5 overflow-hidden rounded-full bg-accent-track", tone === "ink" && "bg-raised", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500",
          tone === "accent" && "bg-accent",
          tone === "warning" && "bg-status-selection",
          tone === "ink" && "bg-ink",
        )}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}
