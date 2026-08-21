import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { Exercise, SetLog, Template, TemplateItem } from "../db/db";
import {
  ensureSession,
  everydayTemplates,
  exerciseMap,
  findSession,
  lastPerformance,
  logSet,
  rotationTemplates,
  sessionLogs,
  suggestTemplateId,
  templateItems,
  updateItem,
  type Ghost,
  type Settings,
} from "../db/repo";
import { scheduleSync } from "../sync/engine";
import { localDateStr, fmtDateLong, weekdayShort } from "../lib/dates";
import { tap } from "../lib/haptics";
import { maybeAskNotificationPermission } from "../lib/notify";
import { startRest, useRest } from "../state/timer";
import { ExerciseCard } from "./ExerciseCard";
import { EditSheet, PromptSheet } from "./EditSheet";

interface Row {
  item: TemplateItem;
  exercise: Exercise;
  logs: SetLog[];
  ghost: Ghost | null;
}

interface Block {
  templateId: string;
  templateName: string;
  rows: Row[];
}

export function TodayView(props: { settings: Settings }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingLog, setEditingLog] = useState<{ log: SetLog; name: string } | null>(null);
  const [editingProg, setEditingProg] = useState<TemplateItem | null>(null);
  const rest = useRest();
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
          ghost: await lastPerformance(item.exercise_id, session?.id ?? null),
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
  ) => {
    const session = await ensureSession(today, block.templateId);
    await logSet({
      sessionId: session.id,
      exerciseId: row.exercise.id,
      setNo,
      value,
      repType: row.item.rep_type,
      progression: row.item.progression,
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
          ghost={row.ghost}
          rest={rest}
          onLog={(setNo, value) => void handleLog(block, row, setNo, value)}
          onOpenLog={(log) => setEditingLog({ log, name: row.exercise.name })}
          onEditProgression={() => setEditingProg(row.item)}
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
        {mainName || " "}
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
        onClose={() => setEditingLog(null)}
      />
      <PromptSheet
        open={!!editingProg}
        title="Progression"
        value={editingProg?.progression ?? ""}
        placeholder="e.g. 4 steps declined ring, 100lb"
        onSave={(v) => {
          if (editingProg) {
            void updateItem(editingProg.id, { progression: v }).then(() => scheduleSync());
          }
        }}
        onClose={() => setEditingProg(null)}
      />
    </div>
  );
}
