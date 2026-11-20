import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/spinner";
import { TABLE_HEAD } from "@/components/ui/table";
import { cn } from "@/lib/cn";

/*
 * Loading states that keep each screen's real frame: the same panels, paddings,
 * grid columns and row heights, with grey bars where the text and controls go.
 * The screens use them while their data loads, and the app shell uses them
 * (by route) while the signed-in user loads, so nothing jumps when it arrives.
 */

// --- Shared layout ------------------------------------------------------------

/** Every app screen's outer padding: the same gap under the top bar everywhere. */
export const PAGE = "px-4 pb-10 pt-5 sm:px-6 lg:px-10";

/** Overview: one height for the left deck, the studio and the right deck on wide screens. */
export const OVERVIEW_ROW_HEIGHT = "lg:h-[clamp(560px,calc(100dvh_-_150px),760px)]";
export const OVERVIEW_GRID = "grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)_360px]";

/** Compact project cards: two on a phone, up to six across on a wide screen. */
export const CARD_GRID = "grid grid-cols-2 gap-3 p-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6";
export const PROJECT_TABLE_COLUMNS = "md:grid-cols-[56px_minmax(0,1.6fr)_minmax(0,1fr)_140px_76px_120px_96px_100px_104px]";
export const BOOKING_COLUMNS = "md:grid-cols-[minmax(0,1.4fr)_120px_minmax(0,1fr)_minmax(0,1fr)_150px_190px]";
export const CLIENT_COLUMNS = "md:grid-cols-[36px_minmax(0,1.5fr)_minmax(0,1fr)_96px_140px_84px]";

export const GRID_BACKGROUND =
  "pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(var(--rule)_1px,transparent_1px),linear-gradient(90deg,var(--rule)_1px,transparent_1px)] [background-size:44px_44px]";

// --- Pieces -------------------------------------------------------------------

/** A bar inside a box of one text line's height, so a skeleton line is as tall as the real one. */
function Line({ line = "h-5", bar = "h-3", className }: { line?: string; bar?: string; className?: string }) {
  return (
    <span className={cn("flex items-center", line)}>
      <Skeleton className={cn(bar, className)} />
    </span>
  );
}

/** The eyebrow, the heading and the grey line under it, as at the top of every board. */
function BoardHeading({ title = "w-40", sub = "w-28" }: { title?: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <Line line="h-4" bar="h-2.5" className="w-16" />
      <div className="mt-1">
        <Line bar="h-3.5" className={title} />
      </div>
      <Line line="h-4" bar="h-2.5" className={sub} />
    </div>
  );
}

/** The large h1 heading block of a board (Schedule month, a project's title). */
function BoardTitle({ eyebrow = "w-24", title = "w-56", sub = "w-72", children }: { eyebrow?: string; title?: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="min-w-0">
      <Line line="h-4" bar="h-2.5" className={eyebrow} />
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Line line="h-7 sm:h-8" bar="h-5 sm:h-6" className={cn(title, "max-w-full")} />
        {children}
      </div>
      <div className="mt-0.5">
        <Line bar="h-3" className={cn(sub, "max-w-full")} />
      </div>
    </div>
  );
}

function Board({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("relative overflow-hidden rounded-board border border-line bg-surface", className)}>
      <div aria-hidden="true" className={GRID_BACKGROUND} />
      {children}
    </section>
  );
}

/** A framed list panel with the eyebrow heading, like Projects, Clients and Bookings. */
function ListPanel({ aside, children }: { aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="relative mt-4 overflow-hidden rounded-[20px] border border-line bg-surface">
      <header className="flex flex-col gap-4 border-b border-rule p-5 lg:flex-row lg:items-start lg:justify-between">
        <BoardHeading />
        {aside}
      </header>
      {children}
    </section>
  );
}

/** A row of status chips in their framed group. */
function ChipGroup({ widths }: { widths: string[] }) {
  return (
    <div className="no-scrollbar overflow-x-auto">
      <div className="inline-flex items-center gap-1 rounded-[12px] border border-line bg-surface p-1">
        {widths.map((width, index) => (
          <span key={index} className={cn("flex h-8 shrink-0 items-center justify-center rounded-[10px] px-3.5", index === 0 && "bg-raised")}>
            <Skeleton className={cn("h-2.5", width)} />
          </span>
        ))}
      </div>
    </div>
  );
}

function IconSlot({ size = "size-8" }: { size?: string }) {
  return (
    <span className={cn("flex shrink-0 items-center justify-center", size)}>
      <Skeleton className="size-4" />
    </span>
  );
}

function SquareButton() {
  return <span className="block size-9 shrink-0 rounded-control border border-line bg-surface" />;
}

/** The header row of a grid table, with short bars for its labels. */
function TableHead({ columns, cells }: { columns: string; cells: (string | null)[] }) {
  return (
    <div className={cn(TABLE_HEAD, columns)} aria-hidden="true">
      {cells.map((width, index) => (
        <span key={index} className="flex h-7 items-center">
          {width && <Skeleton className={cn("h-2.5", width)} />}
        </span>
      ))}
    </div>
  );
}

function Rows({ count, children }: { count: number; children: (index: number) => ReactNode }) {
  return <ul className="divide-y divide-rule">{Array.from({ length: count }, (_, index) => children(index))}</ul>;
}

// Varying widths keep a column of bars from reading as a solid block.
const VARY = ["w-3/5", "w-2/5", "w-1/2", "w-2/3", "w-1/3", "w-3/4"];
const vary = (index: number, offset = 0) => VARY[(index + offset) % VARY.length];

// --- Overview -----------------------------------------------------------------

function OverviewDeck({ title, aside, grow, children }: { title: string; aside?: ReactNode; grow?: boolean; children: ReactNode }) {
  return (
    <section className={cn("flex min-h-0 flex-col overflow-hidden rounded-[16px] border border-line bg-surface", grow ? "flex-1" : "shrink-0")}>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <Line bar="h-3" className={title} />
        <span className="flex items-center gap-2">
          {aside}
          <Skeleton className="size-4" />
        </span>
      </div>
      <div className="min-h-0 flex-1 border-t border-rule px-4 pb-4 pt-3">{children}</div>
    </section>
  );
}

export function OverviewSkeleton() {
  return (
    <div className={PAGE} aria-busy="true">
      <div className={OVERVIEW_GRID}>
        {/* Left deck */}
        <div className={cn("order-2 flex min-h-0 flex-col gap-4 lg:order-1", OVERVIEW_ROW_HEIGHT)}>
          <OverviewDeck title="w-20">
            <div className="space-y-1.5">
              {["w-14", "w-20", "w-12", "w-20", "w-24"].map((width, index) => (
                <div key={index} className="flex items-center justify-between gap-3">
                  <Line bar="h-3" className={width} />
                  <Skeleton className="h-7 w-20 rounded-[8px]" />
                </div>
              ))}
            </div>
          </OverviewDeck>
          <OverviewDeck title="w-24" grow>
            <div className="space-y-1.5">
              {["w-32", "w-28", "w-32", "w-36"].map((width, index) => (
                <div key={index} className="flex h-10 items-center justify-between gap-3 rounded-[10px] bg-raised px-3">
                  <span className={cn("block h-3 rounded-chip bg-active", width)} />
                  <span className="h-5 w-9 rounded-full bg-control" />
                </div>
              ))}
            </div>
            <div className="mt-2.5">
              <Line line="h-4" bar="h-2" className="w-48 max-w-full" />
            </div>
          </OverviewDeck>
        </div>

        {/* The studio */}
        <section className={cn("relative order-1 flex min-h-[420px] flex-col overflow-hidden rounded-[20px] border border-line bg-surface lg:order-2", OVERVIEW_ROW_HEIGHT)}>
          <div aria-hidden="true" className={GRID_BACKGROUND} />
          <div className="relative p-5">
            <Line line="h-4" bar="h-2.5" className="w-24" />
            <div className="mt-1">
              <Line bar="h-3.5" className="w-36" />
            </div>
            <Line line="h-4" bar="h-2.5" className="w-52" />
          </div>
          {/* The isometric floor, flattened like the scene that draws into it. */}
          <div className="relative flex flex-1 items-center justify-center px-4 pb-5">
            <div className="flex w-full max-w-[560px] scale-y-[0.58] items-center justify-center">
              <Skeleton className="aspect-square w-[58%] rotate-45 rounded-[28px]" />
            </div>
          </div>
        </section>

        {/* Right deck */}
        <aside className="order-3 flex min-h-0 flex-col gap-4 lg:col-span-2 2xl:col-span-1 2xl:h-[clamp(560px,calc(100dvh_-_150px),760px)]">
          <OverviewDeck title="w-32" aside={<Skeleton className="h-5 w-7 rounded-[8px]" />}>
            <Line bar="h-3" className="w-32" />
            <Skeleton className="mt-3 h-8 w-40 rounded-control" />
            <div className="mt-3 border-t border-rule pt-3">
              <Line line="h-4" bar="h-2.5" className="w-12" />
            </div>
          </OverviewDeck>
          <section className="flex max-h-[760px] min-h-0 flex-col overflow-hidden rounded-[16px] border border-line bg-surface 2xl:max-h-none 2xl:flex-1">
            <div className="border-b border-rule px-4 py-3">
              <Line bar="h-3" className="w-24" />
              <Line line="h-4" bar="h-2.5" className="w-16" />
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-hidden p-3">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="flex items-center gap-3 rounded-[12px] border border-rule bg-ground/40 p-3">
                  <Skeleton className="size-9 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <Line bar="h-3" className={vary(index, 3)} />
                    <Line line="h-4" bar="h-2.5" className={vary(index, 1)} />
                  </div>
                  <Skeleton className="h-5 w-14 rounded-[6px]" />
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {/* Bottom cards */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="flex min-h-[240px] flex-col items-center rounded-[20px] border border-line bg-surface p-5">
          <Line bar="h-3" className="w-24" />
          <Skeleton className="mt-4 h-10 w-20" />
          <Line line="h-4 mt-1" bar="h-2.5" className="w-28" />
          <div className="mt-5 flex h-20 w-full items-end gap-[3px]">
            {[30, 55, 20, 70, 45, 10, 35, 60, 25, 80, 40, 15, 50, 30].map((height, index) => (
              <span key={index} className="block flex-1 rounded-t-[3px] bg-raised" style={{ height: `${height}%` }} />
            ))}
          </div>
          <div className="mt-auto flex w-full justify-between pt-4">
            {["w-20", "w-20", "w-20"].map((width, index) => (
              <Line key={index} line="h-4" bar="h-2.5" className={width} />
            ))}
          </div>
        </section>
        <section className="flex min-h-[240px] flex-col items-center rounded-[20px] bg-ink p-5">
          <span className="flex h-5 items-center"><span className="block h-3 w-24 rounded-chip bg-ground/15" /></span>
          <span className="mt-4 block h-6 w-20 rounded-[8px] bg-ground/15" />
          <span className="mt-3 block h-10 w-28 rounded-chip bg-ground/15" />
          <span className="mt-3 block h-3.5 w-40 rounded-chip bg-ground/15" />
          <span className="mt-2 block h-2.5 w-24 rounded-chip bg-ground/10" />
        </section>
        <section className="flex min-h-[240px] flex-col items-center rounded-[20px] border border-line bg-surface p-5">
          <Line bar="h-3" className="w-20" />
          <Skeleton className="mt-4 h-10 w-12" />
          <Line line="h-4 mt-1" bar="h-2.5" className="w-32" />
          <div className="mt-4 w-full space-y-0.5">
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex items-start gap-2.5 py-1.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-raised" />
                <div className="min-w-0 flex-1">
                  <Line bar="h-3" className={vary(index, 2)} />
                  <Line line="h-4" bar="h-2.5" className={vary(index, 4)} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// --- Schedule -----------------------------------------------------------------

/** The day sheet's cards, shaped like an agenda item: colour rail, time and date, title, client, place, badges. */
export function SheetSkeleton() {
  return (
    <ul className="space-y-2" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <li key={index} className="flex gap-3 rounded-[12px] border border-rule bg-ground/40 p-3">
          <Skeleton className="w-1 shrink-0 self-stretch rounded-full" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <Line line="h-4" bar="h-2.5" className="w-16" />
              <Line line="h-4" bar="h-2.5" className="w-12" />
            </div>
            <div className="mt-1">
              <Line bar="h-3" className={vary(index, 3)} />
            </div>
            <Line line="h-4" bar="h-2.5" className={vary(index, 1)} />
            <Line line="h-4 mt-0.5" bar="h-2.5" className={vary(index, 4)} />
            <div className="mt-2 flex gap-1.5">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The four project columns under the calendar, with cards shaped like the real ones. */
export function BoardSkeleton() {
  return (
    <div className="mt-4 grid items-start gap-4 md:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
      {[3, 2, 2, 1].map((cards, column) => (
        <section key={column} className="flex flex-col rounded-card border border-line bg-surface">
          <header className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
            <span className="flex items-center gap-2">
              <Skeleton className="size-2 rounded-full" />
              <Line bar="h-3" className="w-20" />
            </span>
            <Skeleton className="h-5 w-9 rounded-[8px]" />
          </header>
          <ul className="space-y-2 p-3">
            {Array.from({ length: cards }, (_, card) => (
              <li key={card} className="rounded-[12px] border border-rule bg-ground/40 p-2.5">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 size-3.5 shrink-0" />
                  <Skeleton className="size-12 shrink-0 rounded-[8px]" />
                  <div className="min-w-0 flex-1">
                    <Line bar="h-3" className={vary(card + column, 3)} />
                    <Line line="h-4" bar="h-2.5" className={vary(card + column, 1)} />
                    <Skeleton className="mt-1 h-5 w-14" />
                  </div>
                  <span className="size-7 shrink-0" />
                </div>
                <div className="mt-1 flex justify-end">
                  <Line bar="h-2.5" className="w-12" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function ScheduleSkeleton() {
  return (
    <div className={PAGE} aria-busy="true">
      <Board>
        <header className="relative flex flex-col gap-4 border-b border-rule p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Line line="h-4" bar="h-2.5" className="w-16" />
            <div className="mt-1">
              <Line line="h-7 sm:h-8" bar="h-5 sm:h-6" className="w-44" />
            </div>
            <Line line="h-5 mt-0.5" bar="h-3" className="w-36" />
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <SquareButton />
            <span className="mx-1 h-5 w-px bg-line" />
            <SquareButton />
            <span className="block h-9 w-[70px] rounded-control border border-line bg-surface" />
            <SquareButton />
          </div>
        </header>

        <div className="relative grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="p-3 sm:p-5">
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {Array.from({ length: 7 }, (_, index) => (
                <span key={index} className="flex h-4 justify-center pb-1.5">
                  <Skeleton className="h-2.5 w-7" />
                </span>
              ))}
            </div>
            <div className="mt-1.5 grid grid-cols-7 gap-1 sm:gap-1.5">
              {Array.from({ length: 42 }, (_, index) => (
                <span key={index} className="flex h-11 flex-col items-center rounded-[10px] border border-rule bg-surface/90 p-1 sm:h-14 sm:items-start sm:p-1.5 xl:h-16">
                  <span className="flex h-5 items-center sm:h-6 sm:px-1">
                    <Skeleton className="h-2.5 w-3.5" />
                  </span>
                </span>
              ))}
            </div>
          </div>

          <div className="border-t border-rule bg-surface/80 lg:relative lg:border-l lg:border-t-0">
            <div className="flex flex-col lg:absolute lg:inset-0">
              <header className="flex items-start justify-between gap-3 border-b border-rule px-5 py-4">
                <BoardHeading title="w-32" sub="w-20" />
                <span className="block size-9 shrink-0 rounded-control border border-line bg-raised" />
              </header>
              <div className="min-h-0 flex-1 overflow-hidden p-3">
                <SheetSkeleton />
              </div>
            </div>
          </div>
        </div>
      </Board>
      <BoardSkeleton />
    </div>
  );
}

// --- Bookings -----------------------------------------------------------------

export function BookingRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-hidden="true">
      <TableHead columns={BOOKING_COLUMNS} cells={["w-20", "w-10", "w-10", "w-14", "w-10", "w-12"]} />
      <Rows count={rows}>
        {(index) => (
          <li key={index} className={cn("grid gap-3 px-5 py-3.5 md:items-center md:gap-5", BOOKING_COLUMNS)}>
            <div className="min-w-0">
              <Line bar="h-3" className={cn(vary(index, 2), "max-w-40")} />
              <Line line="h-4" bar="h-2.5" className={cn(vary(index, 5), "max-w-48")} />
              <div className="mt-1.5 space-y-0.5 md:hidden">
                <Line line="h-4" bar="h-2.5" className="w-40" />
                <Line line="h-4" bar="h-2.5" className="w-28" />
              </div>
            </div>
            <div className="hidden md:block">
              <Line bar="h-3" className="w-24" />
            </div>
            <div className="hidden min-w-0 md:block">
              <Line line="h-4" bar="h-2.5" className="w-4/5" />
              <Line line="h-4" bar="h-2.5" className="w-1/2" />
            </div>
            <div className="hidden md:block">
              <Line line="h-4" bar="h-2.5" className={vary(index, 3)} />
            </div>
            <div className="hidden md:block">
              <Skeleton className="h-5 w-[72px]" />
            </div>
            <div className="flex items-center justify-between gap-2 md:justify-start">
              <Skeleton className="h-5 w-[72px] md:hidden" />
              <span className="flex gap-2">
                <Skeleton className="h-8 w-[72px] rounded-control" />
                <Skeleton className="h-8 w-[72px] rounded-control" />
              </span>
            </div>
          </li>
        )}
      </Rows>
    </div>
  );
}

export function BookingsSkeleton() {
  return (
    <div className={PAGE} aria-busy="true">
      <ChipGroup widths={["w-16", "w-16", "w-16", "w-6"]} />
      <ListPanel
        aside={
          <div className="flex min-w-0 items-center gap-2 lg:w-[440px]">
            <span className="flex h-[42px] min-w-0 flex-1 items-center gap-2 rounded-[12px] border border-line bg-ground/40 ps-3 pe-1">
              <Skeleton className="size-4 shrink-0" />
              <Skeleton className="h-2.5 flex-1" />
              <span className="flex h-8 w-[74px] items-center justify-center"><Skeleton className="h-3 w-12" /></span>
            </span>
            <span className="block h-[42px] w-[46px] shrink-0 rounded-[12px] border border-line bg-surface sm:w-[110px]" />
          </div>
        }
      >
        <BookingRowsSkeleton />
      </ListPanel>
    </div>
  );
}

export function BookingDetailSkeleton() {
  const deck = (title: string, rows: number, extra?: ReactNode) => (
    <section className="overflow-hidden rounded-card border border-line bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-rule px-5 py-3.5">
        <Line bar="h-3" className={title} />
      </header>
      <div className="divide-y divide-rule">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-start gap-3 px-5 py-3">
            <Skeleton className="mt-0.5 size-4 shrink-0" />
            <span className="w-24 shrink-0"><Line bar="h-3" className="w-14" /></span>
            <span className="min-w-0 flex-1"><Line bar="h-3" className={vary(index, 2)} /></span>
          </div>
        ))}
      </div>
      {extra}
    </section>
  );
  const side = (title: string, rows: number) => (
    <section className="overflow-hidden rounded-card border border-line bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-rule px-5 py-3.5">
        <Line bar="h-3" className={title} />
        <Skeleton className="h-5 w-8 rounded-[8px]" />
      </header>
      <div className="divide-y divide-rule">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-start gap-3 px-4 py-3">
            <Line line="h-4" bar="h-2.5" className="w-12" />
            <div className="min-w-0 flex-1">
              <Line bar="h-3" className={vary(index, 3)} />
              <Line line="h-4" bar="h-2.5" className={vary(index, 1)} />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <div className={PAGE} aria-busy="true">
      <Board>
        <div className="relative flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <BoardTitle eyebrow="w-36" title="w-48" sub="w-64">
              <Skeleton className="h-5 w-[72px]" />
            </BoardTitle>
            <Line line="h-4 mt-0.5" bar="h-2.5" className="w-40" />
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Skeleton className="h-8 w-[72px] rounded-control" />
            <Skeleton className="h-8 w-[72px] rounded-control" />
          </div>
        </div>
      </Board>
      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          {deck(
            "w-12",
            4,
            <div className="border-t border-rule px-5 py-4">
              <Line line="h-4" bar="h-2.5" className="w-12" />
              <Line line="h-5 mt-1.5" bar="h-3" className="w-2/3" />
            </div>,
          )}
          {deck("w-16", 3)}
        </div>
        <div className="space-y-4">
          {side("w-20", 2)}
          {side("w-48", 1)}
        </div>
      </div>
    </div>
  );
}

// --- Projects -----------------------------------------------------------------

/** Cards shaped like a project card: cover, title, client, status and payment tags, two facts. */
export function CardsSkeleton({ count = 12 }: { count?: number }) {
  return (
    <ul className={CARD_GRID} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="rounded-[14px] border border-rule bg-ground/40 p-2">
          <Skeleton className="aspect-[4/3] w-full rounded-[10px]" />
          <div className="px-0.5 pt-2">
            <div className="flex flex-col items-start gap-1.5">
              <div className="w-full">
                <Line bar="h-3" className={vary(index, 3)} />
                <Line line="h-4" bar="h-2.5" className={vary(index, 1)} />
              </div>
              <span className="flex gap-1">
                <Skeleton className="h-5 w-14" />
                <Skeleton className="h-5 w-12" />
              </span>
            </div>
            <div className="mt-2 divide-y divide-rule border-t border-rule">
              {["w-10", "w-8"].map((width, row) => (
                <div key={row} className="flex justify-between gap-2 py-1">
                  <Line bar="h-2" className={width} />
                  <Line bar="h-2" className={row ? "w-16" : "w-6"} />
                </div>
              ))}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ProjectTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div aria-hidden="true">
      <TableHead columns={PROJECT_TABLE_COLUMNS} cells={[null, "w-12", "w-10", "w-10", "w-12", "w-10", "w-14", "w-14", "w-12"]} />
      <Rows count={rows}>
        {(index) => (
          <li key={index} className={cn("grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-4 px-5 py-2.5 md:gap-5", PROJECT_TABLE_COLUMNS)}>
            <Skeleton className="aspect-[4/3] w-14 rounded-[8px]" />
            <div className="min-w-0">
              <Line bar="h-3" className={vary(index, 3)} />
              <Line line="h-4" bar="h-2.5" className={vary(index, 1)} />
            </div>
            <div className="hidden md:block"><Line bar="h-3" className={vary(index, 2)} /></div>
            <div className="hidden md:block"><Line line="h-4" bar="h-2.5" className="w-24" /></div>
            <div className="hidden md:block"><Skeleton className="h-5 w-10 rounded-[8px]" /></div>
            <div className="hidden md:block"><Skeleton className="h-5 w-16" /></div>
            <div className="hidden md:block">
              <Skeleton className="h-5 w-14" />
              <Skeleton className="mt-1 h-1 w-16 rounded-full" />
            </div>
            <div className="hidden md:block"><Line line="h-4" bar="h-2.5" className="w-16" /></div>
            <span className="flex items-center gap-0.5">
              <IconSlot />
              <IconSlot />
              <span className="hidden md:flex"><IconSlot /></span>
            </span>
          </li>
        )}
      </Rows>
    </div>
  );
}

export function ProjectsSkeleton({ layout = "cards" }: { layout?: "cards" | "table" }) {
  return (
    <div className={PAGE} aria-busy="true">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <ChipGroup widths={["w-10", "w-16", "w-16", "w-14", "w-[72px]", "w-14"]} />
        <div className="flex items-center gap-2">
          <span className="flex h-[42px] min-w-0 flex-1 items-center gap-3 rounded-[12px] border border-line bg-surface ps-3 xl:w-72 xl:flex-none">
            <Skeleton className="size-4" />
            <Skeleton className="h-2.5 w-40" />
          </span>
          <span className="hidden h-[42px] w-[132px] shrink-0 rounded-[12px] border border-line bg-surface sm:block" />
          <span className="inline-flex shrink-0 gap-1 rounded-[12px] border border-line bg-surface p-1">
            <span className="block size-8 rounded-[8px] bg-raised" />
            <span className="block size-8" />
          </span>
          <Skeleton className="h-[42px] w-[46px] shrink-0 rounded-[12px] sm:w-[134px]" />
        </div>
      </div>
      <ListPanel>{layout === "table" ? <ProjectTableSkeleton /> : <CardsSkeleton />}</ListPanel>
    </div>
  );
}

/** A project's board: breadcrumb, title with its tags, the facts line, the five stations, actions, section chips. */
export function ProjectDetailSkeleton() {
  return (
    <div className={cn(PAGE, "pb-20")} aria-busy="true">
      <Board>
        <div className="relative flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <BoardTitle eyebrow="w-32" title="w-60" sub="w-96">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-16" />
            </BoardTitle>
            <div className="mt-3 grid max-w-md grid-cols-5 gap-1.5">
              {[0, 1, 2, 3, 4].map((index) => (
                <span key={index} className="min-w-0">
                  <Skeleton className="h-1.5 rounded-full" />
                  <Line line="h-4 mt-1.5" bar="h-2" className="w-10" />
                </span>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <SquareButton />
            <SquareButton />
            <SquareButton />
            <Skeleton className="h-9 w-[150px] rounded-control" />
          </div>
        </div>
        <div className="relative flex flex-wrap items-center gap-2 border-t border-rule bg-surface/80 px-5 py-3">
          <ChipGroup widths={["w-20", "w-24", "w-[72px]", "w-14", "w-14"]} />
        </div>
      </Board>
      <div className="mt-4">
        <PhotoGridSkeleton />
      </div>
    </div>
  );
}

/** The photos tab's grid of square tiles with a filename under each. */
export function PhotoGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-card border border-line bg-surface p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8" aria-hidden="true">
      {Array.from({ length: 16 }, (_, index) => (
        <div key={index} className="rounded-card border border-line bg-surface p-1.5">
          <Skeleton className="aspect-square w-full rounded-[10px]" />
          <Skeleton className="mx-1 mb-0.5 mt-2 h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

// --- Clients ------------------------------------------------------------------

export function ClientRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-hidden="true">
      <TableHead columns={CLIENT_COLUMNS} cells={[null, "w-12", "w-12", "w-14", "w-16", "w-12"]} />
      <Rows count={rows}>
        {(index) => (
          <li key={index} className={cn("grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-4 px-5 py-3 md:gap-5", CLIENT_COLUMNS)}>
            <Skeleton className="size-9 rounded-full" />
            <div className="min-w-0">
              <Line bar="h-3" className={cn(vary(index, 2), "max-w-40")} />
              <Line line="h-4" bar="h-2.5" className={cn(vary(index, 5), "max-w-52")} />
            </div>
            <div className="hidden md:block"><Line bar="h-3" className="w-24" /></div>
            <div className="hidden md:block"><Skeleton className="h-5 w-8 rounded-[8px]" /></div>
            <div className="hidden md:block"><Line line="h-4" bar="h-2.5" className="w-20" /></div>
            <span className="flex items-center gap-0.5">
              <IconSlot />
              <IconSlot />
            </span>
          </li>
        )}
      </Rows>
    </div>
  );
}

export function ClientsSkeleton() {
  return (
    <div className={PAGE} aria-busy="true">
      <div className="flex items-center justify-end gap-2">
        <span className="flex h-[42px] min-w-0 flex-1 items-center gap-3 rounded-[12px] border border-line bg-surface ps-3 sm:w-80 sm:flex-none">
          <Skeleton className="size-4" />
          <Skeleton className="h-2.5 w-44" />
        </span>
        <Skeleton className="h-[42px] w-[46px] shrink-0 rounded-[12px] sm:w-[124px]" />
      </div>
      <ListPanel>
        <ClientRowsSkeleton />
      </ListPanel>
    </div>
  );
}

/** A client's board (name, contact line, actions, three facts), then their project cards. */
export function ClientDetailSkeleton() {
  return (
    <div className={cn(PAGE, "pb-20")} aria-busy="true">
      <Board>
        <div className="relative flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
          <BoardTitle eyebrow="w-28" title="w-52" sub="w-72" />
          <div className="flex shrink-0 items-center gap-1.5">
            <SquareButton />
            <SquareButton />
            <Skeleton className="h-9 w-[210px] rounded-control" />
          </div>
        </div>
        <div className="relative grid grid-cols-2 gap-px border-t border-rule bg-rule sm:grid-cols-3">
          {["w-14", "w-16", "w-20"].map((width, index) => (
            <div key={index} className="bg-surface px-5 py-3">
              <Line line="h-4" bar="h-2.5" className={width} />
              <Line line="h-5 mt-0.5" bar="h-3" className="w-20" />
            </div>
          ))}
        </div>
      </Board>
      <section className="relative mt-4 overflow-hidden rounded-board border border-line bg-surface">
        <header className="border-b border-rule p-5">
          <BoardHeading title="w-44" sub="w-36" />
        </header>
        <CardsSkeleton count={6} />
      </section>
    </div>
  );
}

// --- Activity -----------------------------------------------------------------

/** Feed rows under one day heading, shaped like the real rows: icon, sentence and time, project. */
export function FeedSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden="true">
      <div className="flex h-8 items-center gap-3 border-b border-rule bg-ground px-5">
        <Skeleton className="h-2.5 w-12" />
        <Skeleton className="h-2.5 w-3" />
      </div>
      <Rows count={rows}>
        {(index) => (
          <li key={index} className="flex gap-4 px-5 py-4">
            <Skeleton className="mt-0.5 size-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <Line bar="h-3" className={vary(index, 3)} />
                <Line line="h-5 pt-px" bar="h-2.5" className="w-10" />
              </div>
              <Line line="h-5 mt-0.5" bar="h-2.5" className={vary(index, 4)} />
            </div>
          </li>
        )}
      </Rows>
    </div>
  );
}

export function ActivitySkeleton() {
  return (
    <div className={cn(PAGE, "pb-20")} aria-busy="true">
      <Line line="h-4 mb-1" bar="h-2.5" className="w-44" />
      <Line line="h-8 sm:h-[2.125rem]" bar="h-6" className="w-32" />
      <Line line="h-5 mt-1" bar="h-3" className="w-[420px] max-w-full" />
      <div className="mt-7 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {["w-16", "w-28"].map((title, index) => (
          <section key={index} className="overflow-hidden rounded-card border border-line bg-surface">
            <header className="border-b border-line px-5 py-4">
              <Line line="h-6" bar="h-3.5" className={title} />
              <Line line="h-5 mt-0.5" bar="h-3" className="w-64 max-w-full" />
            </header>
            <FeedSkeleton rows={10} />
          </section>
        ))}
      </div>
    </div>
  );
}

// --- Anything else ------------------------------------------------------------

export function GenericPageSkeleton() {
  return (
    <div className={PAGE} aria-busy="true">
      <Line line="h-4 mb-1" bar="h-2.5" className="w-24" />
      <Line line="h-8 sm:h-[2.125rem]" bar="h-6" className="w-48" />
      <Line line="h-5 mt-1" bar="h-3" className="w-72 max-w-full" />
      <Skeleton className="mt-7 h-64 w-full rounded-card" />
    </div>
  );
}

/** The loading frame for a route, used by the app shell before the signed-in user is known. */
export function RouteSkeleton({ pathname }: { pathname: string }) {
  const [, section, id] = pathname.split("/");
  switch (section) {
    case "dashboard":
      return <OverviewSkeleton />;
    case "schedule":
      return <ScheduleSkeleton />;
    case "bookings":
      return id ? <BookingDetailSkeleton /> : <BookingsSkeleton />;
    case "projects":
      return id === "new" ? <GenericPageSkeleton /> : id ? <ProjectDetailSkeleton /> : <ProjectsSkeleton />;
    case "clients":
      return id ? <ClientDetailSkeleton /> : <ClientsSkeleton />;
    case "activity":
      return <ActivitySkeleton />;
    default:
      return <GenericPageSkeleton />;
  }
}
