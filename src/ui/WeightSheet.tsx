import { useEffect, useState } from "react";
import { fmtWeight } from "../lib/targets";
import { closeTopOverlay } from "../state/ui";
import { Sheet } from "./Sheet";

// Added-weight picker for weighted bodyweight work. Chips add plate-sized
// increments; the field takes an exact number; BW resets to bodyweight.
export function WeightSheet(props: {
  open: boolean;
  title: string;
  value: number;
  onSave: (lb: number) => void;
  onClose: () => void;
}) {
  const [lb, setLb] = useState(props.value);
  useEffect(() => {
    if (props.open) setLb(props.value);
  }, [props.open, props.value]);

  const bump = (d: number) => setLb((v) => Math.max(0, Math.round((v + d) * 2) / 2));

  return (
    <Sheet open={props.open} onClose={props.onClose} title={props.title}>
      <div className="flex items-center justify-center gap-5 py-2">
        <button className="btn text-[22px] w-16 h-16 rounded-full" onClick={() => bump(-2.5)} aria-label="Minus 2.5 lb">
          −
        </button>
        <div className="display text-[52px] font-bold min-w-[150px] text-center tabular-nums leading-none text-gold">
          {fmtWeight(lb)}
        </div>
        <button className="btn text-[22px] w-16 h-16 rounded-full" onClick={() => bump(2.5)} aria-label="Plus 2.5 lb">
          +
        </button>
      </div>
      <div className="flex flex-wrap justify-center gap-2 mt-2 mb-4">
        <button className="chip" onClick={() => setLb(0)}>
          BW
        </button>
        {[5, 10, 25, 45].map((d) => (
          <button key={d} className="chip" onClick={() => bump(d)}>
            +{d}
          </button>
        ))}
      </div>
      <label className="block mb-4">
        <div className="eyebrow mb-1">Exact (lb)</div>
        <input
          className="input"
          type="number"
          inputMode="decimal"
          min={0}
          step={0.5}
          value={lb}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setLb(Number.isFinite(v) && v >= 0 ? v : 0);
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
        Use {fmtWeight(lb)}
      </button>
    </Sheet>
  );
}
