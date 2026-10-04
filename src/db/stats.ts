import { db } from "./db";
import { fmtLoad, type Implement } from "../lib/load";

export interface SeriesPoint {
  date: string;
  best: number;
  total: number;
  load: number; // heaviest set that session (per hand for dumbbells)
  label: string; // load + variant; a change marks the chart
  labelChanged: boolean;
}

export interface ExerciseStats {
  points: SeriesPoint[];
  repType: "reps" | "seconds";
  implement: Implement;
  bestEver: { value: number; date: string } | null;
  bestLoad: { value: number; date: string } | null;
  sessionsCount: number;
}

export async function exerciseStats(exerciseId: string): Promise<ExerciseStats> {
  const exercise = await db.exercise.get(exerciseId);
  const implement: Implement = exercise?.implement ?? "bodyweight";
  const logs = await db.set_log
    .where("exercise_id")
    .equals(exerciseId)
    .filter((l) => !l.deleted)
    .toArray();

  const sessions = new Map(
    (await db.session.toArray()).map((s) => [s.id, s]),
  );

  const bySession = new Map<string, typeof logs>();
  for (const l of logs) {
    const arr = bySession.get(l.session_id) ?? [];
    arr.push(l);
    bySession.set(l.session_id, arr);
  }

  const points: SeriesPoint[] = [];
  let repType: "reps" | "seconds" = "reps";
  for (const [sessionId, sessionLogs] of bySession) {
    const session = sessions.get(sessionId);
    if (!session || session.deleted) continue;
    sessionLogs.sort((a, b) => a.set_no - b.set_no);
    repType = sessionLogs[0].rep_type;
    const load = Math.max(...sessionLogs.map((l) => l.weight ?? 0));
    const variants = [...new Set(sessionLogs.map((l) => l.variant).filter(Boolean))].join("/");
    points.push({
      date: session.date,
      best: Math.max(...sessionLogs.map((l) => l.value)),
      total: sessionLogs.reduce((s, l) => s + l.value, 0),
      load,
      label: [fmtLoad(load, implement), variants].filter(Boolean).join(" · "),
      labelChanged: false,
    });
  }
  points.sort((a, b) => (a.date < b.date ? -1 : 1));
  for (let i = 1; i < points.length; i++) {
    points[i].labelChanged = points[i].label !== points[i - 1].label;
  }

  let bestEver: ExerciseStats["bestEver"] = null;
  let bestLoad: ExerciseStats["bestLoad"] = null;
  for (const p of points) {
    if (!bestEver || p.best >= bestEver.value) bestEver = { value: p.best, date: p.date };
    if (!bestLoad || p.load >= bestLoad.value) bestLoad = { value: p.load, date: p.date };
  }

  return { points, repType, implement, bestEver, bestLoad, sessionsCount: points.length };
}
