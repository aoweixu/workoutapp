import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import { exerciseStats } from "../db/stats";
import { liveTemplates, templateItems, exerciseMap } from "../db/repo";
import { fmtDate } from "../lib/dates";
import { fmtValue } from "../lib/targets";
import { Chart, type ChartPoint } from "./Chart";

const COLORS = { best: "#d07248", total: "#5294d6" };

export function ProgressView() {
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [metric, setMetric] = useState<"best" | "total">("best");

  // Default to the most recently trained exercise.
  useEffect(() => {
    if (exerciseId) return;
    void (async () => {
      const logs = await db.set_log.orderBy("logged_at").reverse().limit(1).toArray();
      if (logs[0]) setExerciseId((cur) => cur ?? logs[0].exercise_id);
    })();
  }, [exerciseId]);

  const groups = useLiveQuery(async () => {
    const templates = await liveTemplates();
    const exMap = await exerciseMap();
    const out: { template: string; options: { id: string; name: string }[] }[] = [];
    const seenAll = new Set<string>();
    for (const t of templates) {
      const items = await templateItems(t.id);
      const options = items
        .map((i) => exMap.get(i.exercise_id))
        .filter((e) => e && !e.deleted)
        .map((e) => ({ id: e!.id, name: e!.name }));
      options.forEach((o) => seenAll.add(o.id));
      if (options.length) out.push({ template: t.name, options });
    }
    const rest = [...exMap.values()]
      .filter((e) => !e.deleted && !seenAll.has(e.id))
      .map((e) => ({ id: e.id, name: e.name }));
    if (rest.length) out.push({ template: "Other", options: rest });
    return out;
  }, []);

  const stats = useLiveQuery(
    async () => (exerciseId ? exerciseStats(exerciseId) : null),
    [exerciseId],
  );

  const points: ChartPoint[] =
    stats?.points.map((p) => ({
      date: p.date,
      value: metric === "best" ? p.best : p.total,
      progression: p.progression,
      changed: p.progressionChanged,
      isPR:
        metric === "best" &&
        !!stats.bestEver &&
        p.best === stats.bestEver.value &&
        p.date === stats.bestEver.date,
    })) ?? [];

  const progressionChanges =
    stats?.points.filter((p, i) => i === 0 || p.progressionChanged) ?? [];

  return (
    <div className="px-4 pt-5">
      <div className="eyebrow">Progressive overload</div>
      <h1 className="display text-[40px] font-bold leading-[1.05] mt-0.5 mb-4">Progress</h1>

      <select
        className="input mb-3"
        value={exerciseId ?? ""}
        onChange={(e) => setExerciseId(e.target.value || null)}
        aria-label="Exercise"
      >
        <option value="" disabled>
          Pick an exercise
        </option>
        {(groups ?? []).map((g) => (
          <optgroup key={g.template} label={g.template}>
            {g.options.map((o) => (
              <option key={`${g.template}:${o.id}`} value={o.id}>
                {o.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <div className="flex gap-2 mb-4">
        <button
          className={`chip ${metric === "best" ? "chip-active" : ""}`}
          onClick={() => setMetric("best")}
        >
          Best set
        </button>
        <button
          className={`chip ${metric === "total" ? "chip-active" : ""}`}
          onClick={() => setMetric("total")}
        >
          Session total
        </button>
      </div>

      {stats ? (
        <>
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            <StatTile
              label="Best ever"
              value={stats.bestEver ? fmtValue(stats.bestEver.value, stats.repType) : "—"}
              sub={stats.bestEver ? fmtDate(stats.bestEver.date) : ""}
            />
            <StatTile label="Sessions" value={String(stats.sessionsCount)} sub="logged" />
            <StatTile
              label="Progression"
              value=""
              sub={stats.points[stats.points.length - 1]?.progression || "not set"}
              small
            />
          </div>
          <div className="card p-4">
            <Chart points={points} color={COLORS[metric]} repType={stats.repType} />
          </div>
          {progressionChanges.length > 0 ? (
            <div className="card p-4 mt-3">
              <div className="eyebrow mb-2">Progression timeline</div>
              <div className="space-y-1.5">
                {progressionChanges.map((p, i) => (
                  <div key={i} className="flex justify-between gap-3 text-[14px]">
                    <span className="truncate">{p.progression || "—"}</span>
                    <span className="text-dim shrink-0">{fmtDate(p.date)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="card p-6 text-dim text-[15px]">Pick an exercise to see its history.</div>
      )}
    </div>
  );
}

function StatTile(props: { label: string; value: string; sub: string; small?: boolean }) {
  return (
    <div className="card px-3 py-2.5 min-w-0">
      <div className="eyebrow">{props.label}</div>
      {props.value ? (
        <div className="display text-[26px] font-bold leading-tight">{props.value}</div>
      ) : null}
      <div className={`text-dim truncate ${props.small ? "text-[13px] mt-1" : "text-[12px]"}`}>
        {props.sub}
      </div>
    </div>
  );
}
