// Local-date helpers. Never use toISOString() for calendar dates: an evening
// workout in Mountain Time would land on the next UTC day.

export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const FMT = new Intl.DateTimeFormat("en-CA", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const FMT_LONG = new Intl.DateTimeFormat("en-CA", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

export function fmtDate(s: string): string {
  return FMT.format(parseLocalDate(s));
}

export function fmtDateLong(s: string): string {
  return FMT_LONG.format(parseLocalDate(s));
}

export function fmtShort(s: string): string {
  const d = parseLocalDate(s);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function daysAgo(s: string): number {
  const ms = Date.now() - parseLocalDate(s).getTime();
  return Math.floor(ms / 86_400_000);
}

// ISO weekday: 1=Monday … 7=Sunday.
export function isoWeekday(d: Date = new Date()): number {
  return ((d.getDay() + 6) % 7) + 1;
}

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function weekdayName(iso: number): string {
  return WEEKDAYS[iso - 1] ?? "?";
}

export function weekdayShort(iso: number): string {
  return WEEKDAYS[iso - 1]?.slice(0, 3) ?? "?";
}
