import { clearRest, extendRest, restRemaining, useRest } from "../state/timer";
import { closeRestPip, openRestPip, pipSupported } from "../lib/pip";
import { fmtDuration } from "../lib/targets";
import { IconPopOut } from "./Icons";

// Floating rest pill above the tab bar; visible from anywhere in the app.
// The pop-out button lifts the countdown into a Picture-in-Picture window
// that stays on top even outside the app (see lib/pip.ts).
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
        {pipSupported() ? (
          <button
            className="btn btn-quiet px-2.5 py-2"
            aria-label="Pop timer out"
            onClick={() => void openRestPip()}
          >
            <IconPopOut size={16} />
          </button>
        ) : null}
        <button className="btn btn-quiet px-2.5 py-1.5 text-[13px]" onClick={() => extendRest(30)}>
          +30s
        </button>
        <button
          className="btn px-3 py-1.5 text-[13px]"
          onClick={() => {
            closeRestPip();
            clearRest();
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
