// Target reps live as free text: "15,14,12", "9", "49". Expand to one value
// per set; a single number repeats for every set.

export function parseTargets(text: string, sets: number): number[] {
  const nums = text
    .split(/[,\s]+/)
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (nums.length === 0) return Array(sets).fill(0);
  const out: number[] = [];
  for (let i = 0; i < sets; i++) {
    out.push(nums[Math.min(i, nums.length - 1)]);
  }
  return out;
}

export function fmtValue(value: number, repType: "reps" | "seconds"): string {
  return repType === "seconds" ? `${value}s` : String(value);
}

export function fmtDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
