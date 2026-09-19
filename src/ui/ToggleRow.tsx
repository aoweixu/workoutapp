export function ToggleRow(props: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-[15px]">{props.label}</span>
      <button
        role="switch"
        aria-checked={props.checked}
        onClick={() => props.onChange(!props.checked)}
        className={`w-[46px] h-[27px] rounded-full transition-colors relative ${
          props.checked ? "bg-copper" : "bg-raised border border-line"
        }`}
      >
        <span
          className={`absolute top-[3px] w-[21px] h-[21px] rounded-full bg-ink transition-transform ${
            props.checked ? "translate-x-[22px]" : "translate-x-[3px]"
          }`}
        />
      </button>
    </label>
  );
}
