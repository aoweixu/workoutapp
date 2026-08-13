import type { Exercise, SetLog, TemplateItem } from "../db/db";
import type { Ghost } from "../db/repo";
import { restFraction, type RestState } from "../state/timer";
import { fmtValue, parseTargets } from "../lib/targets";
import { fmtShort } from "../lib/dates";
import { PlateButton } from "./PlateButton";
import { IconPlay } from "./Icons";

export function ExerciseCard(props: {
  item: TemplateItem;
  exercise: Exercise;
  logs: SetLog[];
  ghost: Ghost | null;
  rest: RestState | null;
  onLog: (setNo: number, value: number) => void;
  onOpenLog: (log: SetLog) => void;
  onEditProgression: () => void;
}) {
  const { item, exercise, logs, ghost } = props;
  const bySet = new Map(logs.map((l) => [l.set_no, l]));
  const maxLogged = logs.reduce((m, l) => Math.max(m, l.set_no), 0);
  const slotCount = Math.max(item.target_sets, maxLogged);
  const targets = parseTargets(item.target_reps, slotCount);

  const prefillFor = (setNo: number): number => {
    const g = ghost?.values.get(setNo);
    if (g !== undefined) return g;
    return targets[setNo - 1] ?? targets[targets.length - 1] ?? 0;
  };

  const slots = [];
  for (let setNo = 1; setNo <= slotCount; setNo++) {
    const log = bySet.get(setNo);
    const resting =
      props.rest &&
      props.rest.exerciseId === exercise.id &&
      props.rest.setNo === setNo
        ? restFraction(props.rest)
        : null;
    if (log) {
      slots.push(
        <PlateButton
          key={setNo}
          label={fmtValue(log.value, log.rep_type)}
          state="logged"
          restFraction={resting}
          onClick={() => props.onOpenLog(log)}
          ariaLabel={`Set ${setNo}: ${fmtValue(log.value, log.rep_type)} logged. Tap to edit.`}
        />,
      );
    } else {
      const pre = prefillFor(setNo);
      slots.push(
        <PlateButton
          key={setNo}
          label={fmtValue(pre, item.rep_type)}
          state="ghost"
          onClick={() => props.onLog(setNo, pre)}
          ariaLabel={`Log set ${setNo} at ${fmtValue(pre, item.rep_type)}`}
        />,
      );
    }
  }
  if (maxLogged >= item.target_sets) {
    const extraNo = slotCount + 1;
    slots.push(
      <PlateButton
        key="add"
        label="+"
        state="add"
        onClick={() => props.onLog(extraNo, prefillFor(slotCount))}
        ariaLabel="Log an extra set"
      />,
    );
  }

  const lastLine = ghost
    ? `Last ${[...ghost.values.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, v]) => v)
        .join(" · ")}${item.rep_type === "seconds" ? "s" : ""} on ${fmtShort(ghost.date)}`
    : `Target ${item.target_sets} × ${item.target_reps || "?"}`;

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[17px] font-semibold leading-tight">{exercise.name}</div>
          <div className="text-[13px] text-dim mt-0.5">{lastLine}</div>
        </div>
        {exercise.video_url ? (
          <a
            href={exercise.video_url}
            target="_blank"
            rel="noreferrer"
            className="text-faint shrink-0 p-1 -m-1"
            aria-label={`${exercise.name} form video`}
          >
            <IconPlay size={21} />
          </a>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2.5 mt-3">{slots}</div>
      <button
        className="chip mt-3 max-w-full"
        onClick={props.onEditProgression}
        aria-label="Edit progression"
      >
        <span className="truncate">
          {item.progression || "set progression"}
        </span>
      </button>
    </div>
  );
}
