import { useLayoutEffect, useRef, useState } from "react";
import { fmtShort } from "../lib/dates";
import { fmtValue } from "../lib/targets";

export interface ChartPoint {
  date: string;
  value: number;
  progression: string;
  changed: boolean;
  isPR: boolean;
}

// Single-series session line. X is session order (equal spacing), sparse date
// labels; dashed verticals mark progression changes; gold ring marks the PR.
export function Chart(props: { points: ChartPoint[]; color: string; repType: "reps" | "seconds" }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(340);
  const [active, setActive] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const { points } = props;
  const H = 220;
  const pad = { l: 36, r: 14, t: 16, b: 26 };

  if (points.length === 0) {
    return (
      <div className="card p-6 text-dim text-[15px]">
        No sessions for this exercise yet.
      </div>
    );
  }

  const maxV = Math.max(...points.map((p) => p.value), 1);
  const yMax = niceCeil(maxV * 1.15);
  const ticks = yTicks(yMax);
  const innerW = Math.max(40, width - pad.l - pad.r);
  const innerH = H - pad.t - pad.b;
  const x = (i: number) =>
    pad.l + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => pad.t + innerH - (v / yMax) * innerH;

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");

  const labelIdxs = xLabelIndexes(points.length);
  const act = active !== null ? points[active] : null;

  return (
    <div ref={wrapRef} className="relative">
      {act !== null && active !== null ? (
        <div
          className="absolute -top-1 z-10 card px-3 py-1.5 text-[13px] pointer-events-none whitespace-nowrap"
          style={{
            left: Math.min(Math.max(x(active) - 60, 0), Math.max(width - 150, 0)),
          }}
        >
          <span className="font-semibold">{fmtValue(act.value, props.repType)}</span>
          <span className="text-dim"> · {fmtShort(act.date)}</span>
          {act.progression ? <span className="text-dim"> · {act.progression}</span> : null}
        </div>
      ) : null}
      <svg
        width={width}
        height={H}
        role="img"
        aria-label="Progress over sessions"
        onPointerLeave={() => setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={pad.l}
              x2={width - pad.r}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--color-line)"
              strokeWidth="1"
            />
            <text
              x={pad.l - 7}
              y={y(t) + 3.5}
              textAnchor="end"
              fontSize="11"
              fill="var(--color-dim)"
            >
              {t}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          p.changed ? (
            <line
              key={`c${i}`}
              x1={x(i)}
              x2={x(i)}
              y1={pad.t}
              y2={pad.t + innerH}
              stroke="var(--color-faint)"
              strokeWidth="1"
              strokeDasharray="3 4"
              opacity="0.55"
            />
          ) : null,
        )}
        {active !== null ? (
          <line
            x1={x(active)}
            x2={x(active)}
            y1={pad.t}
            y2={pad.t + innerH}
            stroke="var(--color-dim)"
            strokeWidth="1"
          />
        ) : null}
        <path d={path} fill="none" stroke={props.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.value)} r="3.4" fill={props.color} />
        ))}
        {points.map((p, i) =>
          p.isPR ? (
            <circle
              key={`pr${i}`}
              cx={x(i)}
              cy={y(p.value)}
              r="6.5"
              fill="none"
              stroke="var(--color-gold)"
              strokeWidth="1.8"
            />
          ) : null,
        )}
        <text
          x={x(points.length - 1)}
          y={y(points[points.length - 1].value) - 10}
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          fill="var(--color-ink)"
        >
          {fmtValue(points[points.length - 1].value, props.repType)}
        </text>
        {labelIdxs.map((i) => (
          <text
            key={`x${i}`}
            x={x(i)}
            y={H - 8}
            textAnchor="middle"
            fontSize="11"
            fill="var(--color-dim)"
          >
            {fmtShort(points[i].date)}
          </text>
        ))}
        {points.map((_, i) => {
          const half = points.length === 1 ? innerW / 2 : innerW / (points.length - 1) / 2;
          return (
            <rect
              key={`h${i}`}
              x={x(i) - half}
              y={0}
              width={half * 2}
              height={H}
              fill="transparent"
              onPointerDown={() => setActive(i)}
              onPointerEnter={(e) => {
                if (e.pointerType === "mouse") setActive(i);
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}

function niceCeil(v: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (m * pow >= v) return m * pow;
  }
  return 10 * pow;
}

function yTicks(yMax: number): number[] {
  const step = yMax / 4;
  return [step, step * 2, step * 3, yMax].map((t) => Math.round(t * 10) / 10);
}

function xLabelIndexes(n: number): number[] {
  if (n <= 1) return [0];
  if (n <= 4) return [0, n - 1];
  return [0, Math.floor((n - 1) / 2), n - 1];
}
