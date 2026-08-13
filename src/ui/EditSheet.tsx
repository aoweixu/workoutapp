import { useEffect, useRef, useState } from "react";
import type { SetLog } from "../db/db";
import { removeSetLog, updateSetValue } from "../db/repo";
import { scheduleSync } from "../sync/engine";
import { fmtValue } from "../lib/targets";
import { closeTopOverlay } from "../state/ui";
import { Sheet } from "./Sheet";
import { IconTrash } from "./Icons";

// Adjust or delete a logged set. For timed holds there's a stopwatch: run it
// while you hold, stop it, the elapsed seconds become the value.
export function EditSheet(props: {
  log: SetLog | null;
  exerciseName: string;
  onClose: () => void;
}) {
  const { log } = props;
  const [value, setValue] = useState(0);
  const [running, setRunning] = useState(false);
  const startedAt = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (log) setValue(log.value);
    setRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [log]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!log) return null;

  const step = (d: number) => setValue((v) => Math.max(0, v + d));

  const toggleStopwatch = () => {
    if (running) {
      setRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      startedAt.current = Date.now();
      setRunning(true);
      timerRef.current = setInterval(() => {
        setValue(Math.round((Date.now() - startedAt.current) / 1000));
      }, 200);
    }
  };

  const save = async () => {
    await updateSetValue(log.id, value);
    scheduleSync();
    closeTopOverlay();
  };

  const remove = async () => {
    await removeSetLog(log.id);
    scheduleSync();
    closeTopOverlay();
  };

  return (
    <Sheet open={!!log} onClose={props.onClose} title={`${props.exerciseName} · set ${log.set_no}`}>
      <div className="flex items-center justify-center gap-5 py-3">
        <button className="btn text-[24px] w-16 h-16 rounded-full" onClick={() => step(-1)} aria-label="Minus one">
          −
        </button>
        <div className="display text-[64px] font-bold w-[130px] text-center tabular-nums leading-none">
          {fmtValue(value, log.rep_type)}
        </div>
        <button className="btn text-[24px] w-16 h-16 rounded-full" onClick={() => step(1)} aria-label="Plus one">
          +
        </button>
      </div>
      {log.rep_type === "seconds" ? (
        <button className={`btn w-full mb-3 ${running ? "btn-danger" : ""}`} onClick={toggleStopwatch}>
          {running ? "Stop hold" : "Time the hold"}
        </button>
      ) : null}
      <div className="flex gap-3">
        <button className="btn btn-danger px-3.5" onClick={remove} aria-label="Delete set">
          <IconTrash size={19} />
        </button>
        <button className="btn btn-primary flex-1" onClick={save}>
          Save set
        </button>
      </div>
    </Sheet>
  );
}

export function PromptSheet(props: {
  open: boolean;
  title: string;
  value: string;
  placeholder?: string;
  onSave: (value: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(props.value);
  useEffect(() => {
    if (props.open) setText(props.value);
  }, [props.open, props.value]);
  return (
    <Sheet open={props.open} onClose={props.onClose} title={props.title}>
      <input
        className="input mb-4"
        value={text}
        placeholder={props.placeholder}
        onChange={(e) => setText(e.target.value)}
        autoFocus
      />
      <button
        className="btn btn-primary w-full"
        onClick={() => {
          props.onSave(text);
          closeTopOverlay();
        }}
      >
        Save
      </button>
    </Sheet>
  );
}
