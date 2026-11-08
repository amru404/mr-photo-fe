"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { PageBody, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadError } from "@/components/ui/notice";
import { Segmented } from "@/components/ui/segmented";
import { api, query } from "@/lib/api";
import { dayLabel } from "@/lib/format";
import type { ActivityFeed } from "@/lib/types";
import { useTitle } from "@/lib/use-title";
import { CLIENT_EVENTS, FeedRow, FeedSkeleton } from "@/features/activity/feed";

const PAGE_SIZE = 40;

type Who = "all" | "clients" | "you";

export default function ActivityPage() {
  useTitle("Activity");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [who, setWho] = useState<Who>("all");

  const feed = useQuery({
    queryKey: ["dashboard", limit],
    queryFn: () => api.get<ActivityFeed>(`/dashboard${query({ limit })}`),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });

  const days = (feed.data?.days ?? [])
    .map((day) => ({
      ...day,
      items: day.items.filter((item) => who === "all" || (who === "clients") === CLIENT_EVENTS.includes(item.event)),
    }))
    .filter((day) => day.items.length > 0);

  return (
    <PageBody width="narrow">
      <PageHeader
        eyebrow="Live · refreshes every 30s"
        title="Activity"
        description="Every visit, favorite, comment and delivery across your projects, newest first."
      />

      <Segmented<Who>
        className="mt-7"
        label="Show activity from"
        value={who}
        onChange={setWho}
        options={[
          { value: "all", label: "Everything" },
          { value: "clients", label: "Clients" },
          { value: "you", label: "You & system" },
        ]}
      />

      <div className="mt-5">
        {feed.isPending ? (
          <div className="rounded-card border border-line bg-surface">
            <FeedSkeleton />
          </div>
        ) : feed.isError ? (
          <LoadError what="activity" onRetry={() => feed.refetch()} />
        ) : days.length === 0 ? (
          <EmptyState title="Nothing here yet">
            {feed.data.has_projects ? "Share a gallery link with a client; their visits and picks show up here." : "Create a project to get started."}
          </EmptyState>
        ) : (
          <div className="space-y-8">
            {days.map((day) => (
              <section key={day.date} aria-label={dayLabel(day.date, feed.data.today)}>
                <h2 className="mb-2 flex items-baseline gap-3 text-sm font-semibold text-ink">
                  {dayLabel(day.date, feed.data.today)}
                  <span className="font-mono text-xs font-normal text-faint">{day.items.length}</span>
                </h2>
                <ul className="divide-y divide-rule overflow-hidden rounded-card border border-line bg-surface">
                  {day.items.map((item) => (
                    <FeedRow key={item.id} item={item} />
                  ))}
                </ul>
              </section>
            ))}

            {feed.data.has_more && (
              <div className="text-center">
                <Button loading={feed.isFetching && feed.isPlaceholderData} onClick={() => setLimit((value) => value + PAGE_SIZE)}>
                  Show older activity
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </PageBody>
  );
}
