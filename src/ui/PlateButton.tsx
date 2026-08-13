// The signature control: one weight plate per set. Dashed chalk outline =
// not done (shows what to beat), solid copper plate = logged. A gold ring
// drains around the plate you just racked while you rest.
export function PlateButton(props: {
  label: string;
  state: "ghost" | "logged" | "add";
  restFraction?: number | null;
  onClick: () => void;
  ariaLabel: string;
}) {
  const cls =
    props.state === "logged"
      ? "plate plate-logged"
      : props.state === "add"
        ? "plate plate-add"
        : "plate plate-ghost";
  const frac = props.restFraction ?? null;
  const R = 32;
  const C = 2 * Math.PI * R;
  return (
    <button className={cls} onClick={props.onClick} aria-label={props.ariaLabel}>
      {props.label}
      {frac !== null && frac > 0 ? (
        <svg className="plate-ring" viewBox="0 0 68 68">
          <circle
            cx="34"
            cy="34"
            r={R}
            fill="none"
            stroke="var(--color-gold)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - frac)}
            transform="rotate(-90 34 34)"
          />
        </svg>
      ) : null}
    </button>
  );
}
