"use client";

import { useEffect } from "react";
import { APP_NAME } from "./config";

/** Sets the browser tab title as "Page · App name". */
export function useTitle(title: string | null | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
  }, [title]);
}
