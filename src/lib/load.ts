import { fmtWeight } from "./targets";

// How an exercise is loaded. Decides what the per-set `weight` number means,
// how it is entered (plate selector vs stepper), and which icon marks it.
export type Implement =
  | "bodyweight"
  | "dumbbell"
  | "barbell"
  | "fixedbar"
  | "cable"
  | "machine"
  | "plate";

export interface ImplementInfo {
  label: string;
  hint: string; // what the number means
  step: number; // stepper increment in lb
  chips: number[]; // quick-add amounts
}

export const IMPLEMENTS: Record<Implement, ImplementInfo> = {
  bodyweight: { label: "Bodyweight", hint: "added weight", step: 2.5, chips: [5, 10, 25, 45] },
  dumbbell: { label: "Dumbbell", hint: "per hand", step: 2.5, chips: [5, 10] },
  barbell: { label: "Barbell", hint: "total, bar included", step: 5, chips: [] },
  fixedbar: { label: "Fixed bar", hint: "as labelled on the bar", step: 5, chips: [10, 20] },
  cable: { label: "Cable", hint: "stack as labelled", step: 5, chips: [10, 20] },
  machine: { label: "Machine", hint: "stack as labelled", step: 5, chips: [10, 20] },
  plate: { label: "Plate", hint: "plate held", step: 5, chips: [10, 25, 45] },
};

export const IMPLEMENT_ORDER: Implement[] = [
  "bodyweight",
  "dumbbell",
  "barbell",
  "fixedbar",
  "cable",
  "machine",
  "plate",
];

export const DEFAULT_BAR_LB = 45;
export const BAR_OPTIONS = [45, 35, 15];
export const PLATES = [45, 35, 25, 10, 5, 2.5];

export function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}

export function fmtLoad(weight: number, implement: Implement): string {
  if (implement === "bodyweight") return fmtWeight(weight);
  return `${fmtNum(weight)} lb`;
}

// Secondary detail shown next to a barbell load.
export function perSide(total: number, barLb: number): number {
  return Math.max(0, Math.round(((total - barLb) / 2) * 4) / 4);
}

export function fmtPerSide(total: number, barLb: number): string {
  const s = perSide(total, barLb);
  return s > 0 ? `${fmtNum(s)}/side` : "bar only";
}

// Greedy plate breakdown for one side.
export function platesFor(side: number): number[] {
  const out: number[] = [];
  let rest = side;
  for (const p of PLATES) {
    while (rest >= p - 1e-9) {
      out.push(p);
      rest -= p;
    }
  }
  return out;
}

export function totalFor(barLb: number, side: number[]): number {
  return barLb + 2 * side.reduce((s, p) => s + p, 0);
}
