"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ProjectDetail } from "@/lib/types";

export const projectKey = (id: number | string) => ["project", String(id)] as const;

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKey(id),
    queryFn: async () => (await api.get<{ project: ProjectDetail }>(`/projects/${id}`)).project,
  });
}

/** Refreshes the header, counts and every tab of one project (like the "project-updated" event). */
export function useRefreshProject(id: number | string) {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: projectKey(id) });
}

export function useSetProject(id: number | string) {
  const client = useQueryClient();
  return (project: ProjectDetail) => client.setQueryData(projectKey(id), project);
}
