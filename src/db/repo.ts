import {
  db,
  fresh,
  getMeta,
  nowIso,
  setMeta,
  touched,
  type Exercise,
  type Session,
  type SetLog,
  type Template,
  type TemplateItem,
} from "./db";
import { localDateStr } from "../lib/dates";

// ---------- settings ----------

export interface Settings {
  restDefault: number;
  sound: boolean;
  wakeLock: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  restDefault: 120,
  sound: true,
  wakeLock: true,
};

export async function getSettings(): Promise<Settings> {
  const raw = await getMeta("settings");
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  await setMeta("settings", JSON.stringify(s));
}

// ---------- templates ----------

export async function liveTemplates(): Promise<Template[]> {
  const all = await db.template.filter((t) => !t.deleted).toArray();
  return all.sort((a, b) => a.sort - b.sort);
}

export async function rotationTemplates(): Promise<Template[]> {
  const all = await liveTemplates();
  return all
    .filter((t) => t.rotation_order !== null)
    .sort((a, b) => (a.rotation_order ?? 0) - (b.rotation_order ?? 0));
}

export async function everydayTemplates(): Promise<Template[]> {
  const all = await liveTemplates();
  return all.filter((t) => t.rotation_order === null);
}

export async function templateItems(templateId: string): Promise<TemplateItem[]> {
  const items = await db.template_item
    .where("template_id")
    .equals(templateId)
    .filter((i) => !i.deleted)
    .toArray();
  return items.sort((a, b) => a.sort - b.sort);
}

// Suggest today's workout: the rotation template after the most recent
// rotation session. If a rotation session already exists today, stick to it.
export async function suggestTemplateId(): Promise<string | null> {
  const rotation = await rotationTemplates();
  if (rotation.length === 0) return null;
  const rotationIds = new Set(rotation.map((t) => t.id));
  const sessions = (
    await db.session.filter((s) => !s.deleted && rotationIds.has(s.template_id)).toArray()
  ).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  if (sessions.length === 0) return rotation[0].id;
  const latest = sessions[0];
  if (latest.date === localDateStr()) return latest.template_id;
  const idx = rotation.findIndex((t) => t.id === latest.template_id);
  return rotation[(idx + 1) % rotation.length].id;
}

// ---------- sessions & logging ----------

export async function findSession(
  date: string,
  templateId: string,
): Promise<Session | undefined> {
  const s = await db.session
    .where("[date+template_id]")
    .equals([date, templateId])
    .filter((x) => !x.deleted)
    .first();
  return s;
}

export async function ensureSession(
  date: string,
  templateId: string,
): Promise<Session> {
  const existing = await findSession(date, templateId);
  if (existing) return existing;
  const row = fresh({ date, template_id: templateId, notes: "" });
  await db.session.add(row);
  return row;
}

export async function sessionLogs(sessionId: string): Promise<SetLog[]> {
  const logs = await db.set_log
    .where("session_id")
    .equals(sessionId)
    .filter((l) => !l.deleted)
    .toArray();
  return logs.sort((a, b) => a.set_no - b.set_no);
}

export async function logSet(args: {
  sessionId: string;
  exerciseId: string;
  setNo: number;
  value: number;
  repType: "reps" | "seconds";
  progression: string;
}): Promise<SetLog> {
  const row = fresh({
    session_id: args.sessionId,
    exercise_id: args.exerciseId,
    set_no: args.setNo,
    value: args.value,
    rep_type: args.repType,
    progression: args.progression,
    logged_at: nowIso(),
  });
  await db.set_log.add(row);
  return row;
}

export async function updateSetValue(id: string, value: number): Promise<void> {
  const row = await db.set_log.get(id);
  if (!row) return;
  await db.set_log.put(touched(row, { value }));
}

export async function removeSetLog(id: string): Promise<void> {
  const row = await db.set_log.get(id);
  if (!row) return;
  await db.set_log.put(touched(row, { deleted: 1 }));
}

export async function removeSession(id: string): Promise<void> {
  const logs = await db.set_log.where("session_id").equals(id).toArray();
  await db.transaction("rw", [db.set_log, db.session], async () => {
    for (const l of logs) {
      if (!l.deleted) await db.set_log.put(touched(l, { deleted: 1 }));
    }
    const s = await db.session.get(id);
    if (s) await db.session.put(touched(s, { deleted: 1 }));
  });
}

export async function saveSessionNotes(id: string, notes: string): Promise<void> {
  const row = await db.session.get(id);
  if (!row) return;
  await db.session.put(touched(row, { notes }));
}

// Last performance of an exercise before the given session: values by set_no,
// plus the date it happened. This is what pre-fills the plates.
export interface Ghost {
  date: string;
  progression: string;
  values: Map<number, number>;
}

export async function lastPerformance(
  exerciseId: string,
  excludeSessionId: string | null,
): Promise<Ghost | null> {
  const logs = await db.set_log
    .where("exercise_id")
    .equals(exerciseId)
    .filter((l) => !l.deleted && l.session_id !== excludeSessionId)
    .toArray();
  if (logs.length === 0) return null;
  logs.sort((a, b) => (a.logged_at < b.logged_at ? 1 : -1));
  const lastSessionId = logs[0].session_id;
  const session = await db.session.get(lastSessionId);
  const values = new Map<number, number>();
  for (const l of logs.filter((x) => x.session_id === lastSessionId)) {
    values.set(l.set_no, l.value);
  }
  return {
    date: session?.date ?? "",
    progression: logs[0].progression,
    values,
  };
}

// ---------- history ----------

export interface SessionSummary {
  session: Session;
  templateName: string;
  sets: number;
  volume: number;
}

export async function listSessionSummaries(): Promise<SessionSummary[]> {
  const sessions = (await db.session.filter((s) => !s.deleted).toArray()).sort(
    (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0),
  );
  const templates = new Map(
    (await db.template.toArray()).map((t) => [t.id, t.name]),
  );
  const out: SessionSummary[] = [];
  for (const s of sessions) {
    const logs = await sessionLogs(s.id);
    if (logs.length === 0 && s.date !== localDateStr()) continue;
    out.push({
      session: s,
      templateName: templates.get(s.template_id) ?? "?",
      sets: logs.length,
      volume: logs.reduce((sum, l) => sum + l.value, 0),
    });
  }
  return out;
}

// ---------- exercises & plan editing ----------

export async function liveExercises(): Promise<Exercise[]> {
  const all = await db.exercise.filter((e) => !e.deleted).toArray();
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function exerciseMap(): Promise<Map<string, Exercise>> {
  return new Map((await db.exercise.toArray()).map((e) => [e.id, e]));
}

export async function createExercise(name: string): Promise<Exercise> {
  const row = fresh({ name: name.trim(), video_url: "", notes: "" });
  await db.exercise.add(row);
  return row;
}

export async function updateExercise(
  id: string,
  patch: Partial<Pick<Exercise, "name" | "video_url" | "notes">>,
): Promise<void> {
  const row = await db.exercise.get(id);
  if (!row) return;
  await db.exercise.put(touched(row, patch));
}

export async function updateItem(
  id: string,
  patch: Partial<
    Pick<
      TemplateItem,
      "target_sets" | "target_reps" | "progression" | "rep_type" | "rest_seconds" | "sort"
    >
  >,
): Promise<void> {
  const row = await db.template_item.get(id);
  if (!row) return;
  await db.template_item.put(touched(row, patch));
}

export async function addItem(
  templateId: string,
  exerciseId: string,
): Promise<void> {
  const items = await templateItems(templateId);
  const row = fresh({
    template_id: templateId,
    exercise_id: exerciseId,
    target_sets: 3,
    target_reps: "8",
    progression: "",
    rep_type: "reps" as const,
    rest_seconds: null,
    sort: items.length === 0 ? 0 : Math.max(...items.map((i) => i.sort)) + 1,
  });
  await db.template_item.add(row);
}

export async function removeItem(id: string): Promise<void> {
  const row = await db.template_item.get(id);
  if (!row) return;
  await db.template_item.put(touched(row, { deleted: 1 }));
}

export async function moveItem(id: string, dir: -1 | 1): Promise<void> {
  const row = await db.template_item.get(id);
  if (!row) return;
  const items = await templateItems(row.template_id);
  const idx = items.findIndex((i) => i.id === id);
  const target = items[idx + dir];
  if (!target) return;
  await db.transaction("rw", db.template_item, async () => {
    await db.template_item.put(touched(row, { sort: target.sort }));
    await db.template_item.put(touched(target, { sort: row.sort }));
  });
}

export async function renameTemplate(id: string, name: string): Promise<void> {
  const row = await db.template.get(id);
  if (!row) return;
  await db.template.put(touched(row, { name }));
}

// ---------- backup ----------

export async function exportJson(): Promise<string> {
  const dump = {
    app: "overload",
    exported_at: nowIso(),
    exercise: await db.exercise.toArray(),
    template: await db.template.toArray(),
    template_item: await db.template_item.toArray(),
    session: await db.session.toArray(),
    set_log: await db.set_log.toArray(),
  };
  return JSON.stringify(dump, null, 1);
}

export async function importJson(text: string): Promise<void> {
  const data = JSON.parse(text);
  if (data.app !== "overload") throw new Error("Not an Overload backup file");
  await db.transaction(
    "rw",
    [db.exercise, db.template, db.template_item, db.session, db.set_log, db.meta],
    async () => {
      await db.exercise.clear();
      await db.template.clear();
      await db.template_item.clear();
      await db.session.clear();
      await db.set_log.clear();
      await db.exercise.bulkAdd(data.exercise ?? []);
      await db.template.bulkAdd(data.template ?? []);
      await db.template_item.bulkAdd(data.template_item ?? []);
      await db.session.bulkAdd(data.session ?? []);
      await db.set_log.bulkAdd(data.set_log ?? []);
      await db.meta.put({ key: "seeded", value: "1" });
    },
  );
}
