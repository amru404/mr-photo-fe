"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageBody, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { LoadError } from "@/components/ui/notice";
import { api, query } from "@/lib/api";
import { cn } from "@/lib/cn";
import { dayLabel } from "@/lib/format";
import type { ActivityPage as ActivityPageData } from "@/lib/types";
import { useTitle } from "@/lib/use-title";
import { FeedRow, FeedSkeleton } from "@/features/activity/feed";

const PER_PAGE = 10;

const COLUMNS = [
  {
    scope: "clients",
    title: "Clients",
    description: "Gallery visits, favorites, comments and downloads.",
    empty: "No client activity yet. Share a gallery link and their visits show up here.",
  },
  {
    scope: "you",
    title: "You & system",
    description: "Projects, status changes, deliveries and payments.",
    empty: "Nothing from you yet.",
  },
] as const;

type Column = (typeof COLUMNS)[number];

export default function ActivityPage() {
  useTitle("Activity");

  return (
    <PageBody>
      <PageHeader
        eyebrow="Live · refreshes every 30s"
        title="Activity"
        description="Every visit, favorite, comment and delivery across your projects, newest first."
      />

      <div className="mt-7 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {COLUMNS.map((column) => (
          <ActivityCard key={column.scope} column={column} />
        ))}
      </div>
    </PageBody>
  );
}

function ActivityCard({ column }: { column: Column }) {
  const [page, setPage] = useState(1);

  const feed = useQuery({
    queryKey: ["activity", column.scope, page],
    queryFn: () => api.get<ActivityPageData>(`/dashboard${query({ scope: column.scope, page, per_page: PER_PAGE })}`),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });

  const data = feed.data;
  const days = data?.days ?? [];
  const changingPage = feed.isFetching && feed.isPlaceholderData;
  const first = (page - 1) * PER_PAGE + 1;
  const shown = days.reduce((sum, day) => sum + day.items.length, 0);

  return (
    <section aria-label={column.title} className="overflow-hidden rounded-card border border-line bg-surface">
      <header className="border-b border-line px-5 py-4">
        <h2 className="text-base font-semibold text-ink">{column.title}</h2>
        <p className="mt-0.5 text-[13px] text-muted">{column.description}</p>
      </header>

      <div className={cn("transition-opacity", changingPage && "opacity-60")}>
        {feed.isPending ? (
          <FeedSkeleton rows={PER_PAGE} />
        ) : feed.isError ? (
          <div className="p-4">
            <LoadError what={column.title.toLowerCase()} onRetry={() => feed.refetch()} />
          </div>
        ) : days.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted">
            {page > 1 ? "Nothing on this page." : data?.has_projects ? column.empty : "Create a project to get started."}
          </p>
        ) : (
          days.map((day) => (
            <div key={day.date} className="border-b border-rule last:border-b-0">
              <h3 className="flex items-baseline gap-3 border-b border-rule bg-ground px-5 py-2 text-xs font-semibold text-muted">
                {dayLabel(day.date, data!.today)}
                <span className="font-mono font-normal text-faint">{day.items.length}</span>
              </h3>
              <ul className="divide-y divide-rule">
                {day.items.map((item) => (
                  <FeedRow key={item.id} item={item} />
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      {data && (page > 1 || data.has_more) && (
        <footer className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
          <p className="font-mono text-xs text-muted">{shown > 0 ? `${first}–${first + shown - 1}` : "—"}</p>

          <nav aria-label={`${column.title} pages`} className="flex items-center gap-1.5">
            <Button
              size="sm"
              aria-label="Previous page"
              disabled={page === 1 || changingPage}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              icon={<ChevronLeft className="size-4" />}
              className="px-2"
            />
            <span className="min-w-8 text-center font-mono text-[13px] text-ink" aria-current="page">
              {page}
            </span>
            <Button
              size="sm"
              aria-label="Next page"
              disabled={!data.has_more || changingPage}
              onClick={() => setPage((value) => value + 1)}
              icon={<ChevronRight className="size-4" />}
              className="px-2"
            />
          </nav>
        </footer>
      )}
    </section>
  );
}
