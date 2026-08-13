import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { Session, SetLog } from "../db/db";
import {
  exerciseMap,
  listSessionSummaries,
  removeSession,
  saveSessionNotes,
  sessionLogs,
} from "../db/repo";
import { scheduleSync } from "../sync/engine";
import { fmtDate, fmtDateLong } from "../lib/dates";
import { fmtValue } from "../lib/targets";
import { closeTopOverlay, showToast, useOverlayBack } from "../state/ui";
import { EditSheet, PromptSheet } from "./EditSheet";
import { IconChevronRight, IconTrash } from "./Icons";

export function HistoryView() {
  const [openSession, setOpenSession] = useState<Session | null>(null);
  const summaries = useLiveQuery(() => listSessionSummaries(), []) ?? [];

  return (
    <div className="px-4 pt-5">
      <div className="eyebrow">Log book</div>
      <h1 className="display text-[40px] font-bold leading-[1.05] mt-0.5 mb-4">History</h1>
      {summaries.length === 0 ? (
        <div className="card p-6 text-dim text-[15px]">
          No workouts yet. Log your first set on the Today tab and it lands here.
        </div>
      ) : (
        <div className="space-y-2.5">
          {summaries.map(({ session, templateName, sets, volume }) => (
            <button
              key={session.id}
              className="card w-full p-4 flex items-center gap-3 text-left"
              onClick={() => setOpenSession(session)}
            >
              <div className="flex-1 min-w-0">
                <div className="text-[16px] font-semibold">
                  {templateName}
                  <span className="text-dim font-normal"> · {fmtDate(session.date)}</span>
                </div>
                <div className="text-[13px] text-dim mt-0.5">
                  {sets} sets · {volume} reps
                  {session.notes ? ` · ${session.notes}` : ""}
                </div>
              </div>
              <IconChevronRight size={18} className="text-faint shrink-0" />
            </button>
          ))}
        </div>
      )}
      <SessionDetail session={openSession} onClose={() => setOpenSession(null)} />
    </div>
  );
}

function SessionDetail(props: { session: Session | null; onClose: () => void }) {
  const { session } = props;
  const [editingLog, setEditingLog] = useState<{ log: SetLog; name: string } | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  useOverlayBack(!!session, props.onClose);

  const data = useLiveQuery(async () => {
    if (!session) return null;
    const logs = await sessionLogs(session.id);
    const exMap = await exerciseMap();
    const groups = new Map<string, { name: string; logs: SetLog[] }>();
    for (const l of logs) {
      const g = groups.get(l.exercise_id) ?? {
        name: exMap.get(l.exercise_id)?.name ?? "?",
        logs: [],
      };
      g.logs.push(l);
      groups.set(l.exercise_id, g);
    }
    const fresh = await import("../db/db").then((m) => m.db.session.get(session.id));
    return { groups: [...groups.values()], notes: fresh?.notes ?? "" };
  }, [session?.id]);

  if (!session) return null;

  const deleteSession = async () => {
    if (!confirm("Delete this workout and all its sets?")) return;
    await removeSession(session.id);
    scheduleSync();
    showToast("Workout deleted");
    closeTopOverlay();
  };

  return (
    <div className="fixed inset-0 z-30 bg-bg overflow-y-auto pb-28">
      <div className="px-4 pt-5 max-w-[640px] mx-auto">
        <button className="btn btn-quiet -ml-3 mb-1" onClick={closeTopOverlay}>
          ← Back
        </button>
        <div className="eyebrow">{fmtDateLong(session.date)}</div>
        <h1 className="display text-[34px] font-bold leading-[1.05] mt-0.5 mb-3">Session</h1>
        <div className="space-y-3">
          {(data?.groups ?? []).map((g) => (
            <div key={g.name} className="card p-4">
              <div className="text-[16px] font-semibold mb-2">{g.name}</div>
              <div className="flex flex-wrap gap-2">
                {g.logs.map((l) => (
                  <button
                    key={l.id}
                    className="chip"
                    onClick={() => setEditingLog({ log: l, name: g.name })}
                  >
                    <span className="text-faint">S{l.set_no}</span>
                    <span className="text-ink font-semibold">{fmtValue(l.value, l.rep_type)}</span>
                  </button>
                ))}
              </div>
              {g.logs[0]?.progression ? (
                <div className="text-[13px] text-dim mt-2">{g.logs[0].progression}</div>
              ) : null}
            </div>
          ))}
        </div>
        <div className="card p-4 mt-3">
          <div className="eyebrow mb-1">Notes</div>
          <button
            className="text-[15px] text-left w-full min-h-[24px]"
            onClick={() => setEditingNotes(true)}
          >
            {data?.notes || <span className="text-faint">Add a note…</span>}
          </button>
        </div>
        <button className="btn btn-danger w-full mt-4" onClick={() => void deleteSession()}>
          <IconTrash size={18} /> Delete workout
        </button>
      </div>
      <EditSheet
        log={editingLog?.log ?? null}
        exerciseName={editingLog?.name ?? ""}
        onClose={() => setEditingLog(null)}
      />
      <PromptSheet
        open={editingNotes}
        title="Session notes"
        value={data?.notes ?? ""}
        placeholder="How did it go?"
        onSave={(v) => {
          void saveSessionNotes(session.id, v).then(() => scheduleSync());
        }}
        onClose={() => setEditingNotes(false)}
      />
    </div>
  );
}
