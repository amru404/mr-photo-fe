"use client";

import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** The spot in the project board, next to the section chips, where the open tab puts its own controls. */
export const ToolbarSlot = createContext<HTMLElement | null>(null);

/** Renders a tab's filters and actions in the board's single toolbar row instead of above the tab's content. */
export function TabToolbar({ children }: { children: ReactNode }) {
  const slot = useContext(ToolbarSlot);
  return slot ? createPortal(children, slot) : null;
}
