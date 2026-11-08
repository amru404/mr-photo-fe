/** A one-shot message carried across a client-side navigation (like session()->flash). */
let message: string | null = null;

export const flash = {
  set(next: string) {
    message = next;
  },
  take(): string | null {
    const current = message;
    message = null;
    return current;
  },
};
