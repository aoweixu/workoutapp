import type { Exercise, SetLog, TemplateItem } from "../db/db";
import { restFraction, type RestState } from "../state/timer";
import { fmtValue, fmtWeight, parseTargets } from "../lib/targets";
import {
  bestPerSlot,
  lastSession,
  parseVariants,
  sameCombo,
  type Combo,
  type HistoryEntry,
} from "../lib/history";
import { fmtShort } from "../lib/dates";
import { PlateButton } from "./PlateButton";
import { IconPlay } from "./Icons";

export function ExerciseCard(props: {
  item: TemplateItem;
  exercise: Exercise;
  logs: SetLog[];
  history: HistoryEntry[];
  selection: Partial<Combo> | undefined;
  rest: RestState | null;
  onLog: (setNo: number, value: number, combo: Combo) => void;
  onOpenLog: (log: SetLog) => void;
  onEditProgression: () => void;
  onSelect: (patch: Partial<Combo>) => void;
  onPickWeight: (current: number) => void;
}) {
  const { item, exercise, logs, history, selection } = props;
  const weighted = item.track_weight === 1;
  const variants = parseVariants(item.variants);
  const unit = item.rep_type === "seconds" ? "s" : "";

  const todayLast = logs.reduce<SetLog | null>(
    (a, b) => (!a || b.logged_at > a.logged_at ? b : a),
    null,
  );
  const lastAny = lastSession(history);

  // Combo for the sets about to be logged: explicit pick, else today's last
  // set, else last session, else bodyweight / first variant.
  const pickVariant = (): string => {
    if (variants.length === 0) return "";
    for (const c of [selection?.variant, todayLast?.variant, lastAny?.variant]) {
      if (c && variants.includes(c)) return c;
    }
    return variants[0];
  };
  const combo: Combo = {
    weight: weighted ? (selection?.weight ?? todayLast?.weight ?? lastAny?.weight ?? 0) : 0,
    variant: pickVariant(),
  };

  const lastAtCombo = lastSession(history, combo);
  const shownLast = lastAtCombo ?? lastAny;
  const best = bestPerSlot(history, combo);
  const bestCache = new Map<string, typeof best>();
  const bestFor = (c: Combo): typeof best => {
    if (sameCombo(c, combo)) return best;
    const key = `${c.weight}|${c.variant}`;
    let m = bestCache.get(key);
    if (!m) {
      m = bestPerSlot(history, c);
      bestCache.set(key, m);
    }
    return m;
  };

  const bySet = new Map(logs.map((l) => [l.set_no, l]));
  const maxLogged = logs.reduce((m, l) => Math.max(m, l.set_no), 0);
  const slotCount = Math.max(item.target_sets, maxLogged);
  const targets = parseTargets(item.target_reps, slotCount);

  const prefillFor = (setNo: number): number => {
    const g = lastAtCombo?.values.get(setNo);
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
      const prior = bestFor({ weight: log.weight, variant: log.variant }).get(setNo);
      const pr = !!prior && log.value > prior.value;
      slots.push(
        <PlateButton
          key={setNo}
          label={fmtValue(log.value, log.rep_type)}
          state="logged"
          pr={pr}
          restFraction={resting}
          onClick={() => props.onOpenLog(log)}
          ariaLabel={`Set ${setNo}: ${fmtValue(log.value, log.rep_type)} logged${pr ? ", new best" : ""}. Tap to edit.`}
        />,
      );
    } else {
      const pre = prefillFor(setNo);
      slots.push(
        <PlateButton
          key={setNo}
          label={fmtValue(pre, item.rep_type)}
          state="ghost"
          onClick={() => props.onLog(setNo, pre, combo)}
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
        onClick={() => props.onLog(extraNo, prefillFor(slotCount), combo)}
        ariaLabel="Log an extra set"
      />,
    );
  }

  const comboTag = (c: Combo) =>
    [weighted ? fmtWeight(c.weight) : "", c.variant].filter(Boolean).join(" · ") || "no variant";
  const lastLine = shownLast
    ? `Last ${[...shownLast.values.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, v]) => v)
        .join(" · ")}${unit} on ${fmtShort(shownLast.date)}${
        shownLast !== lastAtCombo && (weighted || variants.length) ? ` at ${comboTag(shownLast)}` : ""
      }`
    : `Target ${item.target_sets} × ${item.target_reps || "?"}`;
  const bestLine =
    best.size > 0
      ? Array.from({ length: slotCount }, (_, i) => best.get(i + 1)?.value ?? "–").join(" · ") + unit
      : null;

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[17px] font-semibold leading-tight">{exercise.name}</div>
          <div className="text-[13px] text-dim mt-0.5">{lastLine}</div>
          {bestLine ? (
            <div className="text-[13px] text-dim">
              <span className="text-gold">Best</span> {bestLine}
            </div>
          ) : null}
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
      {weighted || variants.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 mt-2.5">
          {weighted ? (
            <button
              className="chip text-gold font-semibold"
              onClick={() => props.onPickWeight(combo.weight)}
              aria-label="Change added weight"
            >
              {fmtWeight(combo.weight)}
            </button>
          ) : null}
          {variants.map((v) => (
            <button
              key={v}
              className={`chip ${v === combo.variant ? "chip-active" : ""}`}
              onClick={() => props.onSelect({ variant: v })}
              aria-pressed={v === combo.variant}
            >
              {v}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2.5 mt-3">{slots}</div>
      <button
        className="chip mt-3 max-w-full"
        onClick={props.onEditProgression}
        aria-label="Edit progression"
      >
        <span className="truncate">
          {item.progression || "progression · weight · variants"}
        </span>
      </button>
    </div>
  );
}
