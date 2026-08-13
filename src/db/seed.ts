import { db, fresh, getMeta, setMeta, touched, type TemplateItem } from "./db";

// Transcribed from the original Google Sheet routine (2026-08-12). Progression
// stays free text exactly as written; "49s" holds become rep_type "seconds".

type SeedItem = {
  ex: string;
  prog: string;
  sets: number;
  reps: string;
  repType?: "seconds";
  video?: string;
};

type SeedTemplate = { name: string; rotation: number | null; items: SeedItem[] };

const PLAN: SeedTemplate[] = [
  {
    name: "Push A",
    rotation: 1, // Monday
    items: [
      { ex: "Push Up", prog: "4 steps declined ring", sets: 3, reps: "15,14,12", video: "https://www.youtube.com/watch?v=tQhrk6WMcKw" },
      { ex: "Dips", prog: "ring/bar", sets: 3, reps: "9,8,7" },
      { ex: "Incline Bench 30°", prog: "35", sets: 3, reps: "9" },
      { ex: "Tricep Extension", prog: "100lb", sets: 3, reps: "10,9,9" },
      { ex: "Lateral Raise", prog: "30 cable bent arm", sets: 3, reps: "13" },
      { ex: "Isometric Dumbbell Hold", prog: "20lb", sets: 1, reps: "49", repType: "seconds" },
    ],
  },
  {
    name: "Legs",
    rotation: 2, // Tuesday
    items: [
      { ex: "Squat", prog: "Barbell 70 x 2", sets: 3, reps: "8" },
      { ex: "Deadlift", prog: "Barbell 90 x 2", sets: 2, reps: "5,5" },
    ],
  },
  {
    name: "Pull A",
    rotation: 3, // Wednesday
    items: [
      { ex: "Pull Up", prog: "", sets: 3, reps: "14,10,9" },
      { ex: "Single Arm Lat Pulldown", prog: "75", sets: 3, reps: "11", video: "https://www.youtube.com/watch?v=eM162KNncD8" },
      { ex: "Chest Support Row", prog: "45", sets: 3, reps: "11", video: "https://www.youtube.com/watch?v=H75im9fAUMc" },
      { ex: "Face Pull", prog: "110", sets: 3, reps: "9" },
      { ex: "Incline 45 Biceps Curl", prog: "35", sets: 3, reps: "10,8,7" },
    ],
  },
  {
    name: "Push B",
    rotation: 5, // Friday
    items: [
      { ex: "Dips", prog: "ring dips", sets: 3, reps: "9,8,7" },
      { ex: "Overhead Press", prog: "Barbell 5x2", sets: 3, reps: "11" },
      { ex: "Push Up", prog: "4 steps declined ring", sets: 3, reps: "15,13,12" },
      { ex: "Tricep Extension", prog: "100", sets: 3, reps: "10,7,7" },
      { ex: "Lateral Raise", prog: "30 cable bent arm", sets: 3, reps: "11" },
      { ex: "Isometric Dumbbell Hold", prog: "20lb", sets: 1, reps: "49", repType: "seconds" },
    ],
  },
  {
    name: "Pull B",
    rotation: 6, // Saturday
    items: [
      { ex: "Chin Up", prog: "", sets: 3, reps: "10" },
      { ex: "Pull Up", prog: "", sets: 3, reps: "14,10,10" },
      { ex: "Barbell Row", prog: "40", sets: 3, reps: "11" },
      { ex: "Curl", prog: "80 bar", sets: 3, reps: "11,10,10" },
    ],
  },
  {
    name: "Everyday",
    rotation: null,
    items: [
      { ex: "Wrist Curl", prog: "60lb bar", sets: 2, reps: "30" },
      { ex: "Ab Crunch", prog: "machine 325lb", sets: 3, reps: "14" },
      { ex: "Back Extension", prog: "35lb", sets: 3, reps: "10" },
      { ex: "Calf Raise", prog: "50lb each hand", sets: 1, reps: "40" },
    ],
  },
];

export async function seedIfEmpty(): Promise<void> {
  if ((await getMeta("seeded")) === "1") return;
  const templateCount = await db.template.count();
  if (templateCount > 0) {
    await setMeta("seeded", "1");
    return;
  }

  await db.transaction(
    "rw",
    [db.exercise, db.template, db.template_item, db.meta],
    async () => {
      const exerciseIds = new Map<string, string>();
      for (const t of PLAN) {
        for (const item of t.items) {
          if (exerciseIds.has(item.ex)) continue;
          const row = fresh({
            name: item.ex,
            video_url: item.video ?? "",
            notes: "",
          });
          await db.exercise.add(row);
          exerciseIds.set(item.ex, row.id);
        }
      }
      let tSort = 0;
      for (const t of PLAN) {
        const template = fresh({
          name: t.name,
          rotation_order: t.rotation,
          sort: tSort++,
        });
        await db.template.add(template);
        let sort = 0;
        for (const item of t.items) {
          const row: TemplateItem = fresh({
            template_id: template.id,
            exercise_id: exerciseIds.get(item.ex)!,
            target_sets: item.sets,
            target_reps: item.reps,
            progression: item.prog,
            rep_type: item.repType ?? "reps",
            rest_seconds: null,
            sort: sort++,
          });
          await db.template_item.add(row);
        }
      }
      await db.meta.put({ key: "seeded", value: "1" });
    },
  );
}

// v0.1 stored rotation_order as a 1..5 sequence; it now holds the ISO weekday
// (Mon=1 … Sun=7): Push A=Mon, Legs=Tue, Pull A=Wed, Push B=Fri, Pull B=Sat.
// Runs once per device; skips if the data already uses weekday values (6/7
// present), so a device that pulled migrated rows first won't double-map.
export async function migrateToWeekdaySchedule(): Promise<void> {
  if ((await getMeta("weekday_schedule")) === "1") return;
  const scheduled = await db.template
    .filter((t) => !t.deleted && t.rotation_order !== null)
    .toArray();
  const values = new Set(scheduled.map((t) => t.rotation_order));
  const looksLegacy =
    scheduled.length > 0 && !values.has(6) && !values.has(7) && values.has(4);
  if (looksLegacy) {
    const remap = new Map([
      [4, 5], // Push B → Friday
      [5, 6], // Pull B → Saturday
    ]);
    for (const t of scheduled) {
      const next = remap.get(t.rotation_order!);
      if (next !== undefined) {
        await db.template.put(touched(t, { rotation_order: next }));
      }
    }
  }
  await setMeta("weekday_schedule", "1");
}
