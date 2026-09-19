export function ToggleRow(props: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-[15px]">{props.label}</span>
      <button
        role="switch"
        aria-checked={props.checked}
        onClick={() => props.onChange(!props.checked)}
        className={`w-[46px] h-[27px] rounded-full border transition-colors relative ${
          props.checked ? "bg-copper border-copper" : "bg-raised border-line"
        }`}
      >
        <span
          className={`absolute left-0 top-[2px] w-[21px] h-[21px] rounded-full bg-ink transition-transform ${
            props.checked ? "translate-x-[21px]" : "translate-x-[2px]"
          }`}
        />
      </button>
    </label>
  );
}
