import { useSyncExternalStore } from "react";
import type { Combo } from "../lib/history";

// Weight/variant picked on a card for the sets about to be logged, keyed by
// exercise id. Module-level so it survives tab switches; after a reload the
// card falls back to today's last logged set, then the last session.

let selections = new Map<string, Partial<Combo>>();
const listeners = new Set<() => void>();

export function setSelection(exerciseId: string, patch: Partial<Combo>): void {
  selections = new Map(selections);
  selections.set(exerciseId, { ...selections.get(exerciseId), ...patch });
  listeners.forEach((f) => f());
}

export function useSelections(): Map<string, Partial<Combo>> {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => selections,
  );
}
