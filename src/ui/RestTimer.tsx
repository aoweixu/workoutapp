import { clearRest, extendRest, restRemaining, useRest } from "../state/timer";
import { fmtDuration } from "../lib/targets";

// Floating rest pill above the tab bar; visible from anywhere in the app.
export function RestTimerPill() {
  const rest = useRest();
  if (!rest) return null;
  const remaining = restRemaining(rest);
  return (
    <div className="fixed left-0 right-0 bottom-[74px] z-30 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto card flex items-center gap-3 pl-4 pr-2 py-2 shadow-xl">
        <div>
          <div className="eyebrow">Rest · {rest.exerciseName}</div>
          <div className="display text-[26px] font-bold leading-none tabular-nums text-gold">
            {fmtDuration(remaining)}
          </div>
        </div>
        <button className="btn btn-quiet px-2.5 py-1.5 text-[13px]" onClick={() => extendRest(30)}>
          +30s
        </button>
        <button className="btn px-3 py-1.5 text-[13px]" onClick={clearRest}>
          Done
        </button>
      </div>
    </div>
  );
}
