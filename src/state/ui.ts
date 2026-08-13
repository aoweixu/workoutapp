import { useEffect, useSyncExternalStore } from "react";

// ---------- toast ----------

interface Toast {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
}

let toasts: Toast[] = [];
let toastSeq = 0;
const toastListeners = new Set<() => void>();

export function showToast(text: string, action?: Toast["action"]): void {
  const id = ++toastSeq;
  toasts = [...toasts, { id, text, action }];
  toastListeners.forEach((f) => f());
  if (!action) {
    setTimeout(() => dismissToast(id), 3200);
  }
}

export function dismissToast(id: number): void {
  toasts = toasts.filter((t) => t.id !== id);
  toastListeners.forEach((f) => f());
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    (fn) => {
      toastListeners.add(fn);
      return () => toastListeners.delete(fn);
    },
    () => toasts,
  );
}

// ---------- Android back button closes overlays ----------

interface Overlay {
  id: number;
  onClose: () => void;
}

const overlayStack: Overlay[] = [];
let overlaySeq = 0;

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    const top = overlayStack.pop();
    if (top) top.onClose();
  });
}

// While `open`, one history entry backs this overlay; hardware back (or
// closeTopOverlay) pops it and calls onClose.
export function useOverlayBack(open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!open) return;
    const id = ++overlaySeq;
    overlayStack.push({ id, onClose });
    history.pushState({ overlay: id }, "");
    return () => {
      const idx = overlayStack.findIndex((o) => o.id === id);
      if (idx !== -1) overlayStack.splice(idx, 1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}

export function closeTopOverlay(): void {
  history.back();
}
