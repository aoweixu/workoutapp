import { useEffect, useState } from "react";
import type { Exercise } from "../db/db";
import { updateExercise } from "../db/repo";
import { scheduleSync } from "../sync/engine";
import {
  BAR_OPTIONS,
  DEFAULT_BAR_LB,
  IMPLEMENTS,
  PLATES,
  fmtLoad,
  fmtNum,
  fmtPerSide,
  perSide,
  platesFor,
  totalFor,
} from "../lib/load";
import { closeTopOverlay } from "../state/ui";
import { Sheet } from "./Sheet";
import { ImplementIcon } from "./ImplementIcon";

// Load picker. Shape follows the exercise's implement: barbells get a plate
// selector (bar + plates per side, total derived), everything else a stepper
// with implement-sized steps and quick-add chips. Saves a single lb number.
export function LoadSheet(props: {
  open: boolean;
  exercise: Exercise | null;
  value: number;
  onSave: (lb: number) => void;
  onClose: () => void;
}) {
  const ex = props.exercise;
  const implement = ex?.implement ?? "bodyweight";
  const info = IMPLEMENTS[implement];
  const [lb, setLb] = useState(props.value);
  const [bar, setBar] = useState(ex?.bar_lb ?? DEFAULT_BAR_LB);
  const [side, setSide] = useState<number[]>([]);

  useEffect(() => {
    if (!props.open) return;
    const b = ex?.bar_lb ?? DEFAULT_BAR_LB;
    setLb(props.value);
    setBar(b);
    setSide(platesFor(perSide(props.value, b)));
  }, [props.open, props.value, ex?.bar_lb]);

  if (!ex) return null;

  const clamp = (v: number) => Math.max(0, Math.round(v * 4) / 4);
  const bump = (d: number) => setLb((v) => clamp(v + d));

  const setPlates = (next: number[], barLb = bar) => {
    setSide(next);
    setLb(totalFor(barLb, next));
  };
  const changeBar = (b: number) => {
    setBar(b);
    setLb(totalFor(b, side));
    void updateExercise(ex.id, { bar_lb: b }).then(() => scheduleSync());
  };
  const setExact = (v: number) => {
    setLb(v);
    if (implement === "barbell") setSide(platesFor(perSide(v, bar)));
  };

  const title = `${ex.name}`;
  const big = fmtLoad(lb, implement);

  return (
    <Sheet open={props.open} onClose={props.onClose} title={title}>
      <div className="flex items-center gap-2 text-[13px] text-dim -mt-1 mb-2">
        <ImplementIcon implement={implement} size={16} />
        <span className="font-semibold text-ink">{info.label}</span>
        <span>· {info.hint}</span>
      </div>

      {implement === "barbell" ? (
        <>
          <div className="text-center py-1">
            <div className="display text-[52px] font-bold tabular-nums leading-none text-gold">{big}</div>
            <div className="text-[13px] text-dim mt-1">
              {fmtNum(bar)} bar · {fmtPerSide(lb, bar)}
            </div>
          </div>
          <div className="flex items-end justify-center gap-[3px] h-[88px] my-2" aria-label="Plates per side">
            <div className="w-10 h-[6px] rounded bg-faint/60 self-center" />
            {side.length === 0 ? (
              <div className="text-[13px] text-faint self-center px-2">bar only</div>
            ) : (
              side.map((p, i) => (
                <button
                  key={`${p}-${i}`}
                  className="rounded-[5px] border border-line bg-raised text-ink display font-semibold text-[11px] flex items-end justify-center pb-1 active:scale-95"
                  style={{ width: p >= 25 ? 26 : p >= 5 ? 22 : 16, height: plateHeight(p) }}
                  onClick={() => setPlates(side.filter((_, j) => j !== i))}
                  aria-label={`Remove ${fmtNum(p)} plate`}
                >
                  {p === 2.5 ? "2½" : p}
                </button>
              ))
            )}
            <div className="w-6 h-[6px] rounded bg-faint/60 self-center" />
          </div>
          <div className="flex flex-wrap justify-center gap-2 mb-3">
            {PLATES.map((p) => (
              <button key={p} className="chip text-ink font-semibold" onClick={() => setPlates([...side, p].sort((a, b) => b - a))}>
                +{fmtNum(p)}
              </button>
            ))}
            <button className="chip" onClick={() => setPlates([])}>
              clear
            </button>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="eyebrow">Bar</span>
            {BAR_OPTIONS.map((b) => (
              <button key={b} className={`chip ${b === bar ? "chip-active" : ""}`} onClick={() => changeBar(b)}>
                {b} lb
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-center gap-5 py-2">
            <button className="btn text-[22px] w-16 h-16 rounded-full" onClick={() => bump(-info.step)} aria-label={`Minus ${info.step} lb`}>
              −
            </button>
            <div className="display text-[52px] font-bold min-w-[150px] text-center tabular-nums leading-none text-gold">
              {big}
            </div>
            <button className="btn text-[22px] w-16 h-16 rounded-full" onClick={() => bump(info.step)} aria-label={`Plus ${info.step} lb`}>
              +
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-1 mb-3">
            {implement === "bodyweight" ? (
              <button className="chip" onClick={() => setLb(0)}>
                BW
              </button>
            ) : null}
            {info.chips.map((d) => (
              <button key={d} className="chip" onClick={() => bump(d)}>
                +{d}
              </button>
            ))}
          </div>
        </>
      )}

      <label className="block mb-4">
        <div className="eyebrow mb-1">Exact (lb{implement === "barbell" ? ", total" : ""})</div>
        <input
          className="input"
          type="number"
          inputMode="decimal"
          min={0}
          step={0.5}
          value={lb}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setExact(Number.isFinite(v) && v >= 0 ? v : 0);
          }}
        />
      </label>
      <button
        className="btn btn-primary w-full"
        onClick={() => {
          props.onSave(lb);
          closeTopOverlay();
        }}
      >
        Use {big}
      </button>
    </Sheet>
  );
}

function plateHeight(p: number): number {
  if (p >= 45) return 84;
  if (p >= 35) return 74;
  if (p >= 25) return 62;
  if (p >= 10) return 46;
  if (p >= 5) return 36;
  return 28;
}
