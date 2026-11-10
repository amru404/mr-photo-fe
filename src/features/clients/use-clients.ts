"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ClientOption } from "@/lib/types";

/** Every client by name, for pickers and filters (`GET /clients/all`). */
export function useClientOptions() {
  return useQuery({
    queryKey: ["clients", "all"],
    queryFn: async () => (await api.get<{ data: ClientOption[] }>("/clients/all")).data,
    staleTime: 60_000,
  });
}

export const clientKey = (id: number | string) => ["client", String(id)] as const;

/** After a client changes: lists, pickers, its page, and the projects that show its name. */
export function useInvalidateClients() {
  const client = useQueryClient();
  return () => {
    client.invalidateQueries({ queryKey: ["clients"] });
    client.invalidateQueries({ queryKey: ["client"] });
    client.invalidateQueries({ queryKey: ["projects"] });
    client.invalidateQueries({ queryKey: ["project"] });
  };
}
