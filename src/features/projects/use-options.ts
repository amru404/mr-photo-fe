"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Options } from "@/lib/types";

/** Categories, stages, presets and sizes from the backend enums. */
export function useOptions() {
  return useQuery({
    queryKey: ["options"],
    queryFn: () => api.get<Options>("/projects/options"),
    staleTime: Infinity,
  });
}
