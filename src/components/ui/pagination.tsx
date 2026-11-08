import { ChevronLeft, ChevronRight } from "lucide-react";
import { number } from "@/lib/format";
import type { Paginated } from "@/lib/types";
import { Button } from "./button";

/** "13–24 of 40" with previous and next. Hidden when everything fits on one page. */
export function Pagination({ meta, onPage, noun }: { meta: Paginated; onPage: (page: number) => void; noun: string }) {
  if (meta.last_page <= 1) return null;
  return (
    <nav className="flex items-center justify-between gap-4" aria-label="Pagination">
      <p className="text-sm text-muted tabular">
        {number(meta.from ?? 0)}–{number(meta.to ?? 0)} of {number(meta.total)} {noun}
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={meta.current_page <= 1}
          onClick={() => onPage(meta.current_page - 1)}
          icon={<ChevronLeft className="size-4" />}
        >
          Previous
        </Button>
        <Button size="sm" disabled={meta.current_page >= meta.last_page} onClick={() => onPage(meta.current_page + 1)}>
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </nav>
  );
}
