import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import { exerciseStats } from "../db/stats";
import { liveTemplates, templateItems, exerciseMap } from "../db/repo";
import { fmtDate } from "../lib/dates";
import { IMPLEMENTS, fmtLoad } from "../lib/load";
import { fmtValue } from "../lib/targets";
import { Chart, type ChartPoint } from "./Chart";
import { ImplementIcon } from "./ImplementIcon";

type Metric = "best" | "total" | "load";
const COLORS: Record<Metric, string> = { best: "#d07248", total: "#5294d6", load: "#e3a93c" };

export function ProgressView() {
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>("best");

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

  const fmt = (v: number) =>
    metric === "load" ? fmtLoad(v, stats?.implement ?? "bodyweight") : fmtValue(v, stats?.repType ?? "reps");

  const points: ChartPoint[] =
    stats?.points.map((p) => ({
      date: p.date,
      value: metric === "best" ? p.best : metric === "total" ? p.total : p.load,
      label: p.label,
      changed: p.labelChanged,
      isPR:
        (metric === "best" &&
          !!stats.bestEver &&
          p.best === stats.bestEver.value &&
          p.date === stats.bestEver.date) ||
        (metric === "load" &&
          !!stats.bestLoad &&
          stats.bestLoad.value > 0 &&
          p.load === stats.bestLoad.value &&
          p.date === stats.bestLoad.date),
    })) ?? [];

  const loadChanges = stats?.points.filter((p, i) => i === 0 || p.labelChanged) ?? [];
  const latest = stats?.points[stats.points.length - 1];

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
        {(
          [
            ["best", "Best set"],
            ["total", "Session total"],
            ["load", "Load"],
          ] as [Metric, string][]
        ).map(([m, label]) => (
          <button key={m} className={`chip ${metric === m ? "chip-active" : ""}`} onClick={() => setMetric(m)}>
            {label}
          </button>
        ))}
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
              label="Load"
              value={latest ? fmtLoad(latest.load, stats.implement) : "—"}
              sub={IMPLEMENTS[stats.implement].label}
              icon={<ImplementIcon implement={stats.implement} size={14} className="text-dim" />}
            />
          </div>
          <div className="card p-4">
            <Chart points={points} color={COLORS[metric]} fmt={fmt} />
          </div>
          {loadChanges.length > 0 ? (
            <div className="card p-4 mt-3">
              <div className="eyebrow mb-2">Load timeline</div>
              <div className="space-y-1.5">
                {loadChanges.map((p, i) => (
                  <div key={i} className="flex justify-between gap-3 text-[14px]">
                    <span className="truncate">{p.label || "—"}</span>
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

function StatTile(props: { label: string; value: string; sub: string; icon?: React.ReactNode }) {
  return (
    <div className="card px-3 py-2.5 min-w-0">
      <div className="eyebrow flex items-center gap-1.5">
        {props.icon}
        {props.label}
      </div>
      <div className="display text-[26px] font-bold leading-tight truncate">{props.value}</div>
      <div className="text-dim truncate text-[12px]">{props.sub}</div>
    </div>
  );
}
