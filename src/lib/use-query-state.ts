"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Reads and writes URL query parameters (like Livewire's #[Url]), so filters
 * and tabs survive a reload and can be linked to. Defaults stay out of the URL.
 */
export function useQueryState() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const get = useCallback((key: string, fallback = "") => params.get(key) ?? fallback, [params]);

  const set = useCallback(
    (changes: Record<string, string | number | null>, options: { defaults?: Record<string, string> } = {}) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes)) {
        const text = value === null ? "" : String(value);
        if (text === "" || options.defaults?.[key] === text) next.delete(key);
        else next.set(key, text);
      }
      const search = next.toString();
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  return { get, set };
}
