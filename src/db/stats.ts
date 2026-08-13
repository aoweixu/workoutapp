import { db } from "./db";

export interface SeriesPoint {
  date: string;
  best: number;
  total: number;
  progression: string;
  progressionChanged: boolean;
}

export interface ExerciseStats {
  points: SeriesPoint[];
  repType: "reps" | "seconds";
  bestEver: { value: number; date: string } | null;
  sessionsCount: number;
}

export async function exerciseStats(exerciseId: string): Promise<ExerciseStats> {
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
    points.push({
      date: session.date,
      best: Math.max(...sessionLogs.map((l) => l.value)),
      total: sessionLogs.reduce((s, l) => s + l.value, 0),
      progression: sessionLogs[sessionLogs.length - 1].progression,
      progressionChanged: false,
    });
  }
  points.sort((a, b) => (a.date < b.date ? -1 : 1));
  for (let i = 1; i < points.length; i++) {
    points[i].progressionChanged =
      points[i].progression !== points[i - 1].progression;
  }

  let bestEver: ExerciseStats["bestEver"] = null;
  for (const p of points) {
    if (!bestEver || p.best >= bestEver.value) {
      bestEver = { value: p.best, date: p.date };
    }
  }

  return { points, repType, bestEver, sessionsCount: points.length };
}
