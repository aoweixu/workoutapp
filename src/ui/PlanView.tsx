import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Template, type TemplateItem } from "../db/db";
import {
  addItem,
  createExercise,
  exerciseMap,
  liveExercises,
  liveTemplates,
  moveItem,
  removeItem,
  renameTemplate,
  templateItems,
  updateExercise,
  updateItem,
  updateTemplateSchedule,
} from "../db/repo";
import { weekdayName } from "../lib/dates";
import { parseVariants } from "../lib/history";
import { BAR_OPTIONS, IMPLEMENTS, IMPLEMENT_ORDER, type Implement } from "../lib/load";
import { scheduleSync } from "../sync/engine";
import { closeTopOverlay, useOverlayBack } from "../state/ui";
import { Sheet } from "./Sheet";
import { PromptSheet } from "./EditSheet";
import { ToggleRow } from "./ToggleRow";
import { ImplementIcon } from "./ImplementIcon";
import { IconArrowDown, IconArrowUp, IconChevronRight, IconTrash } from "./Icons";

export function PlanView() {
  const [openTemplate, setOpenTemplate] = useState<Template | null>(null);
  const templates = useLiveQuery(() => liveTemplates(), []) ?? [];

  return (
    <div className="px-4 pt-5">
      <div className="eyebrow">Routine</div>
      <h1 className="display text-[40px] font-bold leading-[1.05] mt-0.5 mb-4">Plan</h1>
      <div className="space-y-2.5">
        {templates.map((t) => (
          <button
            key={t.id}
            className="card w-full p-4 flex items-center gap-3 text-left"
            onClick={() => setOpenTemplate(t)}
          >
            <div className="flex-1">
              <div className="text-[16px] font-semibold">{t.name}</div>
              <div className="text-[13px] text-dim mt-0.5">
                {t.rotation_order !== null ? weekdayName(t.rotation_order) : "Every day"}
              </div>
            </div>
            <IconChevronRight size={18} className="text-faint" />
          </button>
        ))}
      </div>
      <TemplateEditor template={openTemplate} onClose={() => setOpenTemplate(null)} />
    </div>
  );
}

function TemplateEditor(props: { template: Template | null; onClose: () => void }) {
  const { template } = props;
  const [editingItem, setEditingItem] = useState<TemplateItem | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [picking, setPicking] = useState(false);
  useOverlayBack(!!template, props.onClose);

  const data = useLiveQuery(async () => {
    if (!template) return null;
    const items = await templateItems(template.id);
    const exMap = await exerciseMap();
    const current = await db.template.get(template.id);
    return {
      name: current?.name ?? template.name,
      weekday: current?.rotation_order ?? null,
      rows: items.map((item) => ({ item, exercise: exMap.get(item.exercise_id) })),
    };
  }, [template?.id]);

  if (!template) return null;

  return (
    <div className="fixed inset-0 z-30 bg-bg overflow-y-auto pb-28">
      <div className="px-4 pt-5 max-w-[640px] mx-auto">
        <button className="btn btn-quiet -ml-3 mb-1" onClick={closeTopOverlay}>
          ← Back
        </button>
        <button className="block text-left" onClick={() => setRenaming(true)}>
          <h1 className="display text-[34px] font-bold leading-[1.05]">{data?.name}</h1>
          <div className="text-[13px] text-dim">Tap name to rename</div>
        </button>
        <label className="block mt-3 max-w-[240px]">
          <div className="eyebrow mb-1">Scheduled on</div>
          <select
            className="input"
            value={data?.weekday === null ? "null" : String(data?.weekday ?? "null")}
            onChange={(e) => {
              const v = e.target.value === "null" ? null : parseInt(e.target.value, 10);
              void updateTemplateSchedule(template.id, v).then(() => scheduleSync());
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <option key={d} value={d}>
                {weekdayName(d)}
              </option>
            ))}
            <option value="null">Every day (accessories)</option>
          </select>
        </label>
        <div className="space-y-2.5 mt-4">
          {(data?.rows ?? []).map(({ item, exercise }) => {
            const implement = exercise?.implement ?? "bodyweight";
            return (
              <div key={item.id} className="card p-3.5 flex items-center gap-2">
                <button className="flex-1 min-w-0 text-left" onClick={() => setEditingItem(item)}>
                  <div className="text-[15px] font-semibold truncate">{exercise?.name ?? "?"}</div>
                  <div className="text-[13px] text-dim flex items-center gap-1.5 flex-wrap">
                    <span>
                      {item.target_sets} × {item.target_reps || "?"}
                      {item.rep_type === "seconds" ? "s" : ""}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      · <ImplementIcon implement={implement} size={13} /> {IMPLEMENTS[implement].label}
                      {implement === "bodyweight" && item.track_weight ? " + weight" : ""}
                    </span>
                    {item.variants ? <span>· {item.variants}</span> : null}
                    {item.rest_seconds ? <span>· rest {item.rest_seconds}s</span> : null}
                  </div>
                </button>
                <button
                  className="btn btn-quiet p-2"
                  onClick={() => void moveItem(item.id, -1).then(() => scheduleSync())}
                  aria-label="Move up"
                >
                  <IconArrowUp size={17} />
                </button>
                <button
                  className="btn btn-quiet p-2"
                  onClick={() => void moveItem(item.id, 1).then(() => scheduleSync())}
                  aria-label="Move down"
                >
                  <IconArrowDown size={17} />
                </button>
              </div>
            );
          })}
        </div>
        <button className="btn w-full mt-3" onClick={() => setPicking(true)}>
          + Add exercise
        </button>
      </div>

      <ItemSheet item={editingItem} onClose={() => setEditingItem(null)} />
      <ExercisePicker
        open={picking}
        templateId={template.id}
        onClose={() => setPicking(false)}
      />
      <PromptSheet
        open={renaming}
        title="Rename day"
        value={data?.name ?? ""}
        onSave={(v) => {
          if (v.trim()) void renameTemplate(template.id, v.trim()).then(() => scheduleSync());
        }}
        onClose={() => setRenaming(false)}
      />
    </div>
  );
}

// Bar options for pull-up style movements. One switch enables the pair; the
// card then offers a one-at-a-time pick, stored in the variants string.
const BAR_VARIANTS = ["Angled", "Straight"];

export function ItemSheet(props: { item: TemplateItem | null; onClose: () => void; showRemove?: boolean }) {
  const { item } = props;
  const exercise = useLiveQuery(
    async () =>
      item ? (await exerciseMap()).get(item.exercise_id) : undefined,
    [item?.id],
  );
  // Switches are controlled, so they need the live row rather than the
  // snapshot the sheet was opened with.
  const live = useLiveQuery(() => (item ? db.template_item.get(item.id) : undefined), [item?.id]);
  if (!item) return null;

  const patch = (p: Parameters<typeof updateItem>[1]) =>
    void updateItem(item.id, p).then(() => scheduleSync());
  const patchExercise = (p: Parameters<typeof updateExercise>[1]) => {
    if (exercise) void updateExercise(exercise.id, p).then(() => scheduleSync());
  };
  const enabledVariants = parseVariants(live?.variants ?? item.variants);
  const implement: Implement = exercise?.implement ?? "bodyweight";

  return (
    <Sheet open={!!item} onClose={props.onClose} title={exercise?.name ?? "Exercise"}>
      <div className="space-y-3.5">
        <div>
          <div className="eyebrow mb-1.5">Loaded with</div>
          <div className="grid grid-cols-4 gap-1.5">
            {IMPLEMENT_ORDER.map((imp) => {
              const on = imp === implement;
              return (
                <button
                  key={imp}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[11px] font-medium ${
                    on ? "border-copper bg-copper/15 text-ink" : "border-line bg-raised text-dim"
                  }`}
                  aria-pressed={on}
                  onClick={() => patchExercise({ implement: imp })}
                >
                  <ImplementIcon implement={imp} size={20} />
                  {IMPLEMENTS[imp].label}
                </button>
              );
            })}
          </div>
          <div className="text-[12.5px] text-faint mt-1.5">
            Load is entered as: {IMPLEMENTS[implement].hint}.
          </div>
        </div>
        {implement === "barbell" ? (
          <div className="flex items-center gap-2">
            <span className="eyebrow">Bar</span>
            {BAR_OPTIONS.map((b) => (
              <button
                key={b}
                className={`chip ${(exercise?.bar_lb ?? 45) === b ? "chip-active" : ""}`}
                onClick={() => patchExercise({ bar_lb: b })}
              >
                {b} lb
              </button>
            ))}
          </div>
        ) : null}
        {implement === "bodyweight" ? (
          <ToggleRow
            label="Added weight (belt / vest)"
            checked={(live?.track_weight ?? item.track_weight) === 1}
            onChange={(v) => patch({ track_weight: v ? 1 : 0 })}
          />
        ) : null}
        <ToggleRow
          label={
            enabledVariants.length > 0 && enabledVariants.join(", ") !== BAR_VARIANTS.join(", ")
              ? `Variant toggle (${enabledVariants.join(" / ")})`
              : "Bar toggle (Angled / Straight)"
          }
          checked={enabledVariants.length > 0}
          onChange={(v) => patch({ variants: v ? BAR_VARIANTS.join(", ") : "" })}
        />
        <div className="text-[12.5px] text-faint -mt-2">
          Adds variant chips to the card; the one you pick is saved with each set.
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <div className="eyebrow mb-1">Sets</div>
            <input
              className="input"
              type="number"
              min={1}
              defaultValue={item.target_sets}
              onBlur={(e) => {
                const v = parseInt(e.target.value, 10);
                if (v > 0) patch({ target_sets: v });
              }}
            />
          </label>
          <label className="block">
            <div className="eyebrow mb-1">Target ({item.rep_type})</div>
            <input
              className="input"
              defaultValue={item.target_reps}
              placeholder="15,14,12"
              onBlur={(e) => patch({ target_reps: e.target.value.trim() })}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <div className="eyebrow mb-1">Counted in</div>
            <select
              className="input"
              defaultValue={item.rep_type}
              onChange={(e) => patch({ rep_type: e.target.value as "reps" | "seconds" })}
            >
              <option value="reps">Reps</option>
              <option value="seconds">Seconds (hold)</option>
            </select>
          </label>
          <label className="block">
            <div className="eyebrow mb-1">Rest (s, blank = default)</div>
            <input
              className="input"
              type="number"
              min={0}
              defaultValue={item.rest_seconds ?? ""}
              onBlur={(e) => {
                const v = parseInt(e.target.value, 10);
                patch({ rest_seconds: Number.isFinite(v) && v > 0 ? v : null });
              }}
            />
          </label>
        </div>
        <label className="block">
          <div className="eyebrow mb-1">Form video URL</div>
          <input
            className="input"
            defaultValue={exercise?.video_url ?? ""}
            placeholder="https://youtube.com/…"
            onBlur={(e) => patchExercise({ video_url: e.target.value.trim() })}
          />
        </label>
        {props.showRemove !== false ? (
          <button
            className="btn btn-danger w-full"
            onClick={() => {
              void removeItem(item.id).then(() => scheduleSync());
              closeTopOverlay();
            }}
          >
            <IconTrash size={18} /> Remove from this day
          </button>
        ) : null}
      </div>
    </Sheet>
  );
}

function ExercisePicker(props: { open: boolean; templateId: string; onClose: () => void }) {
  const [newName, setNewName] = useState("");
  const exercises = useLiveQuery(() => liveExercises(), []) ?? [];

  const pick = async (exerciseId: string) => {
    await addItem(props.templateId, exerciseId);
    scheduleSync();
    closeTopOverlay();
  };

  const createAndPick = async () => {
    const name = newName.trim();
    if (!name) return;
    const ex = await createExercise(name);
    setNewName("");
    await pick(ex.id);
  };

  return (
    <Sheet open={props.open} onClose={props.onClose} title="Add exercise">
      <div className="flex gap-2 mb-3">
        <input
          className="input flex-1"
          placeholder="New exercise name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button className="btn btn-primary" onClick={() => void createAndPick()}>
          Create
        </button>
      </div>
      <div className="max-h-[45vh] overflow-y-auto space-y-1.5">
        {exercises.map((e) => (
          <button
            key={e.id}
            className="card w-full px-3.5 py-2.5 text-left text-[15px] flex items-center gap-2"
            onClick={() => void pick(e.id)}
          >
            <ImplementIcon implement={e.implement ?? "bodyweight"} size={16} className="text-dim" />
            {e.name}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
