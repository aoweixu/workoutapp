import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { Exercise, SetLog, Template, TemplateItem } from "../db/db";
import {
  ensureSession,
  everydayTemplates,
  exerciseHistory,
  exerciseMap,
  findSession,
  logSet,
  rotationTemplates,
  sessionLogs,
  suggestTemplateId,
  templateItems,
  type Settings,
} from "../db/repo";
import { scheduleSync } from "../sync/engine";
import { localDateStr, fmtDateLong, weekdayShort } from "../lib/dates";
import { tap } from "../lib/haptics";
import { parseVariants, type Combo, type HistoryEntry } from "../lib/history";
import { maybeAskNotificationPermission } from "../lib/notify";
import { setSelection, useSelections } from "../state/selection";
import { startRest, useRest } from "../state/timer";
import { ExerciseCard } from "./ExerciseCard";
import { EditSheet } from "./EditSheet";
import { ItemSheet } from "./PlanView";
import { WeightSheet } from "./WeightSheet";

interface Row {
  item: TemplateItem;
  exercise: Exercise;
  logs: SetLog[];
  history: HistoryEntry[];
}

interface Block {
  templateId: string;
  templateName: string;
  rows: Row[];
}

export function TodayView(props: { settings: Settings }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingLog, setEditingLog] = useState<{ log: SetLog; item: TemplateItem; name: string } | null>(null);
  const [editingProg, setEditingProg] = useState<TemplateItem | null>(null);
  const [pickingWeight, setPickingWeight] = useState<{ exerciseId: string; name: string; value: number } | null>(null);
  const rest = useRest();
  const selections = useSelections();
  const today = localDateStr();

  useEffect(() => {
    if (!selectedId) {
      void suggestTemplateId().then((id) => setSelectedId((cur) => cur ?? id));
    }
  }, [selectedId]);

  const rotation = useLiveQuery(() => rotationTemplates(), []) ?? [];

  const data = useLiveQuery(async () => {
    const exMap = await exerciseMap();
    const build = async (t: Template): Promise<Block> => {
      const session = (await findSession(today, t.id)) ?? null;
      const items = await templateItems(t.id);
      const logs = session ? await sessionLogs(session.id) : [];
      const rows: Row[] = [];
      for (const item of items) {
        const exercise = exMap.get(item.exercise_id);
        if (!exercise) continue;
        rows.push({
          item,
          exercise,
          logs: logs.filter((l) => l.exercise_id === item.exercise_id),
          history: await exerciseHistory(item.exercise_id, session?.id ?? null),
        });
      }
      return { templateId: t.id, templateName: t.name, rows };
    };
    const rotationList = await rotationTemplates();
    const main = selectedId ? rotationList.find((t) => t.id === selectedId) : undefined;
    const blocks: { main: Block | null; everyday: Block[] } = {
      main: main ? await build(main) : null,
      everyday: [],
    };
    for (const t of await everydayTemplates()) {
      blocks.everyday.push(await build(t));
    }
    return blocks;
  }, [selectedId, today]);

  const handleLog = async (
    block: Block,
    row: Row,
    setNo: number,
    value: number,
    combo: Combo,
  ) => {
    const session = await ensureSession(today, block.templateId);
    await logSet({
      sessionId: session.id,
      exerciseId: row.exercise.id,
      setNo,
      value,
      repType: row.item.rep_type,
      progression: row.item.progression,
      weight: combo.weight,
      variant: combo.variant,
    });
    tap();
    maybeAskNotificationPermission();
    startRest({
      exerciseId: row.exercise.id,
      exerciseName: row.exercise.name,
      setNo,
      seconds: row.item.rest_seconds ?? props.settings.restDefault,
    });
    scheduleSync();
  };

  const renderBlock = (block: Block) => (
    <div key={block.templateId} className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
      {block.rows.map((row) => (
        <ExerciseCard
          key={row.item.id}
          item={row.item}
          exercise={row.exercise}
          logs={row.logs}
          history={row.history}
          selection={selections.get(row.exercise.id)}
          rest={rest}
          onLog={(setNo, value, combo) => void handleLog(block, row, setNo, value, combo)}
          onOpenLog={(log) => setEditingLog({ log, item: row.item, name: row.exercise.name })}
          onEditProgression={() => setEditingProg(row.item)}
          onSelect={(patch) => setSelection(row.exercise.id, patch)}
          onPickWeight={(current) =>
            setPickingWeight({ exerciseId: row.exercise.id, name: row.exercise.name, value: current })
          }
        />
      ))}
    </div>
  );

  const restDay = data !== undefined && !data.main;
  const mainName = data?.main?.templateName ?? (restDay ? "Rest day" : "");

  return (
    <div className="px-4 pt-5 pb-2">
      <div className="eyebrow">{fmtDateLong(today)}</div>
      <h1 className="display text-[40px] font-bold leading-[1.05] mt-0.5 mb-3">
        {mainName || " "}
      </h1>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 mb-4 [scrollbar-width:none]">
        {rotation.map((t) => (
          <button
            key={t.id}
            className={`chip ${t.id === selectedId ? "chip-active" : ""}`}
            onClick={() => setSelectedId(t.id)}
          >
            {t.name}
            {t.rotation_order !== null ? (
              <span className="text-faint">{weekdayShort(t.rotation_order)}</span>
            ) : null}
          </button>
        ))}
      </div>

      {restDay ? (
        <div className="card p-5 mb-3">
          <div className="text-[15px] text-dim">
            Nothing scheduled today. Missed a day? Tap it above to catch up,
            it logs under today's date.
          </div>
        </div>
      ) : null}

      {data?.main ? renderBlock(data.main) : null}

      {data?.everyday.map((block) => (
        <div key={block.templateId} className="mt-6">
          <div className="eyebrow mb-2">{block.templateName}</div>
          {renderBlock(block)}
        </div>
      ))}

      <EditSheet
        log={editingLog?.log ?? null}
        exerciseName={editingLog?.name ?? ""}
        trackWeight={editingLog ? editingLog.item.track_weight === 1 : undefined}
        variants={editingLog ? parseVariants(editingLog.item.variants) : undefined}
        onClose={() => setEditingLog(null)}
      />
      <WeightSheet
        open={!!pickingWeight}
        title={`${pickingWeight?.name ?? ""} · added weight`}
        value={pickingWeight?.value ?? 0}
        onSave={(lb) => {
          if (pickingWeight) setSelection(pickingWeight.exerciseId, { weight: lb });
        }}
        onClose={() => setPickingWeight(null)}
      />
      <ItemSheet item={editingProg} onClose={() => setEditingProg(null)} showRemove={false} />
    </div>
  );
}
