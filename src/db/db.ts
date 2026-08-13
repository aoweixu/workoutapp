import Dexie, { type EntityTable } from "dexie";

// All synced rows carry: client-generated uuid, ISO updated_at for LWW,
// soft-delete flag, and a local-only dirty flag (1 = not yet pushed).
export interface Synced {
  id: string;
  updated_at: string;
  deleted: 0 | 1;
  dirty: 0 | 1;
}

export interface Exercise extends Synced {
  name: string;
  video_url: string;
  notes: string;
}

export interface Template extends Synced {
  name: string;
  // ISO weekday this day is scheduled on (1=Mon … 7=Sun).
  // null = everyday accessories block. (Field name is historical.)
  rotation_order: number | null;
  sort: number;
}

export interface TemplateItem extends Synced {
  template_id: string;
  exercise_id: string;
  target_sets: number;
  // Free text, e.g. "15,14,12" or "9" or "49". Interpreted per rep_type.
  target_reps: string;
  // Free text progression: "4 steps declined ring", "100lb", "Barbell 70 x 2".
  progression: string;
  rep_type: "reps" | "seconds";
  rest_seconds: number | null;
  sort: number;
}

export interface Session extends Synced {
  date: string; // local yyyy-mm-dd
  template_id: string;
  notes: string;
}

export interface SetLog extends Synced {
  session_id: string;
  exercise_id: string;
  set_no: number;
  value: number; // reps or seconds, per rep_type
  rep_type: "reps" | "seconds";
  progression: string; // snapshot at log time
  logged_at: string; // ISO
}

export interface Meta {
  key: string;
  value: string;
}

export const db = new Dexie("overload") as Dexie & {
  exercise: EntityTable<Exercise, "id">;
  template: EntityTable<Template, "id">;
  template_item: EntityTable<TemplateItem, "id">;
  session: EntityTable<Session, "id">;
  set_log: EntityTable<SetLog, "id">;
  meta: EntityTable<Meta, "key">;
};

db.version(1).stores({
  exercise: "id, name, dirty",
  template: "id, rotation_order, dirty",
  template_item: "id, template_id, exercise_id, dirty",
  session: "id, date, template_id, [date+template_id], dirty",
  set_log: "id, session_id, exercise_id, logged_at, [exercise_id+logged_at], dirty",
  meta: "key",
});

export const SYNCED_TABLES = [
  "exercise",
  "template",
  "template_item",
  "session",
  "set_log",
] as const;
export type SyncedTableName = (typeof SYNCED_TABLES)[number];

export function uuid(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export async function getMeta(key: string): Promise<string | null> {
  const row = await db.meta.get(key);
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await db.meta.put({ key, value });
}

// Stamp helpers for local writes.
export function fresh<T extends object>(row: T): T & Synced {
  return {
    id: uuid(),
    updated_at: nowIso(),
    deleted: 0,
    dirty: 1,
    ...row,
  } as T & Synced;
}

export function touched<T extends Synced>(row: T, patch: Partial<NoInfer<T>>): T {
  return { ...row, ...patch, updated_at: nowIso(), dirty: 1 };
}
