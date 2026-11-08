"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Check, CircleAlert } from "lucide-react";
import { Button } from "./button";
import { Dialog } from "./dialog";

// --- Confirm ---------------------------------------------------------------

interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  tone?: "primary" | "danger";
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

// --- Toast -----------------------------------------------------------------

interface Toast {
  id: number;
  message: ReactNode;
  tone: "success" | "error";
}

type ToastFn = (message: ReactNode, tone?: Toast["tone"]) => void;

const ConfirmContext = createContext<ConfirmFn>(async () => false);
const ToastContext = createContext<ToastFn>(() => {});

export const useConfirm = () => useContext(ConfirmContext);
export const useToast = () => useContext(ToastContext);

/**
 * App-wide confirm dialog (replaces wire:confirm) and toasts. Toasts sit at
 * the top centre on phones, where the sticky bars are at the bottom.
 */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(value: boolean) => void>(undefined);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const confirm = useCallback<ConfirmFn>((next) => {
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = undefined;
    setOptions(null);
  };

  const toast = useCallback<ToastFn>((message, tone = "success") => {
    const id = nextId.current++;
    setToasts((list) => [...list, { id, message, tone }]);
    setTimeout(() => setToasts((list) => list.filter((item) => item.id !== id)), 4500);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      <ToastContext.Provider value={toast}>
        {children}

        <Dialog
          open={options !== null}
          onClose={() => settle(false)}
          title={options?.title}
          size="sm"
          footer={
            <>
              <Button onClick={() => settle(false)}>Cancel</Button>
              <Button variant={options?.tone === "danger" ? "danger" : "primary"} onClick={() => settle(true)} autoFocus>
                {options?.confirmLabel ?? "Confirm"}
              </Button>
            </>
          }
        >
          {options?.message && <div className="text-sm text-muted">{options.message}</div>}
        </Dialog>

        <div aria-live="polite" className="pointer-events-none fixed inset-x-4 top-4 z-[70] flex flex-col items-center gap-2">
          {toasts.map((item) => (
            <div
              key={item.id}
              role="status"
              className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-card bg-primary px-4 py-3 text-sm font-medium text-on-primary shadow-float"
            >
              {item.tone === "success" ? (
                <Check className="size-4 shrink-0 text-positive" strokeWidth={2.5} />
              ) : (
                <CircleAlert className="size-4 shrink-0 text-negative" />
              )}
              {item.message}
            </div>
          ))}
        </div>
      </ToastContext.Provider>
    </ConfirmContext.Provider>
  );
}
