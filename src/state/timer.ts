import { useSyncExternalStore } from "react";
import { timerDone } from "../lib/haptics";

// Rest timer. Survives re-renders and tab switches; computes remaining from
// wall clock so background throttling can't drift it.

export interface RestState {
  exerciseId: string;
  exerciseName: string;
  setNo: number;
  endsAt: number;
  totalSeconds: number;
}

let rest: RestState | null = null;
let ticker: ReturnType<typeof setInterval> | null = null;
let soundOn = true;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((f) => f());
}

export function setTimerSound(on: boolean): void {
  soundOn = on;
}

export function startRest(args: {
  exerciseId: string;
  exerciseName: string;
  setNo: number;
  seconds: number;
}): void {
  if (args.seconds <= 0) return;
  rest = {
    exerciseId: args.exerciseId,
    exerciseName: args.exerciseName,
    setNo: args.setNo,
    endsAt: Date.now() + args.seconds * 1000,
    totalSeconds: args.seconds,
  };
  if (ticker) clearInterval(ticker);
  ticker = setInterval(() => {
    if (!rest) return;
    if (Date.now() >= rest.endsAt) {
      clearRest();
      timerDone(soundOn);
    } else {
      // New reference each tick: useSyncExternalStore compares snapshots with
      // Object.is, so a stable reference would suppress every re-render.
      rest = { ...rest };
      emit();
    }
  }, 250);
  emit();
}

export function extendRest(seconds: number): void {
  if (!rest) return;
  rest = { ...rest, endsAt: rest.endsAt + seconds * 1000 };
  emit();
}

export function clearRest(): void {
  rest = null;
  if (ticker) {
    clearInterval(ticker);
    ticker = null;
  }
  emit();
}

export function getRest(): RestState | null {
  return rest;
}

export function useRest(): RestState | null {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => rest,
  );
}

export function restRemaining(r: RestState): number {
  return Math.max(0, Math.ceil((r.endsAt - Date.now()) / 1000));
}

export function restFraction(r: RestState): number {
  return Math.max(0, Math.min(1, (r.endsAt - Date.now()) / (r.totalSeconds * 1000)));
}
