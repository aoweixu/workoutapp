// Pure helpers over an exercise's past sets. A "combo" is the added weight +
// variant a set was done at; bests and prefills only compare like with like
// (a +25 lb pull-up PR says nothing about bodyweight reps).

export interface Combo {
  weight: number;
  variant: string;
}

export interface HistoryEntry extends Combo {
  sessionId: string;
  date: string;
  loggedAt: string;
  setNo: number;
  value: number;
}

export interface PastSession extends Combo {
  date: string;
  values: Map<number, number>;
}

export function sameCombo(a: Combo, b: Combo): boolean {
  return a.weight === b.weight && a.variant === b.variant;
}

export function parseVariants(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Most recent session (entries sorted newest first). With a combo, the most
// recent session that has at least one set at that combo, and only those sets.
export function lastSession(entries: HistoryEntry[], combo?: Combo): PastSession | null {
  const first = combo ? entries.find((e) => sameCombo(e, combo)) : entries[0];
  if (!first) return null;
  const values = new Map<number, number>();
  for (const e of entries) {
    if (e.sessionId !== first.sessionId) continue;
    if (combo && !sameCombo(e, combo)) continue;
    values.set(e.setNo, e.value);
  }
  return { date: first.date, values, weight: first.weight, variant: first.variant };
}

// Best value ever per set slot at this combo.
export function bestPerSlot(
  entries: HistoryEntry[],
  combo: Combo,
): Map<number, { value: number; date: string }> {
  const best = new Map<number, { value: number; date: string }>();
  for (const e of entries) {
    if (!sameCombo(e, combo)) continue;
    const cur = best.get(e.setNo);
    if (!cur || e.value > cur.value) best.set(e.setNo, { value: e.value, date: e.date });
  }
  return best;
}
