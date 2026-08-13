import { db, getMeta, setMeta, SYNCED_TABLES, type SyncedTableName } from "../db/db";
import { getClient } from "./client";

// Push-dirty / pull-since sync. Set logs are append-only in practice, so
// conflicts are rare; mutable rows resolve last-write-wins by updated_at.
// The server stamps updated_at (authoritative clock); pull cursors store the
// raw server string so gt() comparisons are exact.

export type SyncState =
  | "off" // no Supabase config
  | "signedOut"
  | "offline"
  | "syncing"
  | "idle"
  | "error";

export interface SyncStatus {
  state: SyncState;
  pending: number;
  lastSync: string | null;
  error: string | null;
}

let status: SyncStatus = { state: "off", pending: 0, lastSync: null, error: null };
const listeners = new Set<() => void>();

export function subscribeSync(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getSyncStatus(): SyncStatus {
  return status;
}

function setStatus(patch: Partial<SyncStatus>): void {
  status = { ...status, ...patch };
  listeners.forEach((fn) => fn());
}

export async function refreshPending(): Promise<void> {
  let pending = 0;
  for (const t of SYNCED_TABLES) {
    pending += await db.table(t).where("dirty").equals(1).count();
  }
  setStatus({ pending });
}

// ---------- core ----------

const PAGE = 1000;
const CHUNK = 400;

function normIso(s: string): string {
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toISOString();
}

async function pushTable(t: SyncedTableName): Promise<void> {
  const client = getClient()!;
  const dirty = await db.table(t).where("dirty").equals(1).toArray();
  if (dirty.length === 0) return;
  for (let i = 0; i < dirty.length; i += CHUNK) {
    const chunk = dirty.slice(i, i + CHUNK);
    const payload = chunk.map((row) => {
      const { dirty: _d, ...rest } = row as { dirty: number } & Record<string, unknown>;
      return rest;
    });
    const { error } = await client.from(t).upsert(payload, { onConflict: "id" });
    if (error) throw new Error(`${t}: ${error.message}`);
    // Clear dirty only if the row wasn't touched again mid-push.
    await db.transaction("rw", db.table(t), async () => {
      for (const sent of chunk) {
        const cur = (await db.table(t).get(sent.id)) as
          | { updated_at: string; dirty: number }
          | undefined;
        if (cur && cur.updated_at === sent.updated_at) {
          await db.table(t).update(sent.id, { dirty: 0 });
        }
      }
    });
  }
}

async function pullTable(t: SyncedTableName): Promise<void> {
  const client = getClient()!;
  const cursorKey = `pull:${t}`;
  let cursor = await getMeta(cursorKey);
  for (;;) {
    let q = client.from(t).select("*").order("updated_at", { ascending: true }).limit(PAGE);
    if (cursor) q = q.gt("updated_at", cursor);
    const { data, error } = await q;
    if (error) throw new Error(`${t}: ${error.message}`);
    if (!data || data.length === 0) break;
    await db.transaction("rw", db.table(t), async () => {
      for (const incoming of data) {
        const rawUpdated = incoming.updated_at as string;
        const row = { ...incoming, updated_at: normIso(rawUpdated), dirty: 0 };
        delete row.user_id;
        const local = (await db.table(t).get(row.id)) as
          | { updated_at: string; dirty: number }
          | undefined;
        if (local && local.dirty === 1 && local.updated_at >= row.updated_at) {
          continue; // local edit is newer and unpushed — it wins
        }
        await db.table(t).put(row);
      }
    });
    cursor = data[data.length - 1].updated_at as string;
    await setMeta(cursorKey, cursor);
    if (data.length < PAGE) break;
  }
}

// A brand-new device that signed in while still holding only the untouched
// seed adopts the server's plan instead of pushing duplicate seed rows.
async function adoptServerIfCleanDevice(): Promise<void> {
  const everPulled = await getMeta("pull:template");
  if (everPulled) return;
  const logCount = await db.set_log.filter((l) => !l.deleted).count();
  if (logCount > 0) return;
  const client = getClient()!;
  const { data, error } = await client.from("template").select("id").limit(1);
  if (error) throw new Error(`template: ${error.message}`);
  if (!data || data.length === 0) return; // server empty — our seed becomes truth
  for (const t of ["exercise", "template", "template_item", "session", "set_log"] as const) {
    await db.table(t).where("dirty").equals(1).delete();
  }
}

let syncing = false;
let queued = false;

export async function syncNow(): Promise<void> {
  const client = getClient();
  if (!client) {
    setStatus({ state: "off" });
    return;
  }
  const { data } = await client.auth.getSession();
  if (!data.session) {
    setStatus({ state: "signedOut" });
    await refreshPending();
    return;
  }
  if (!navigator.onLine) {
    setStatus({ state: "offline" });
    await refreshPending();
    return;
  }
  if (syncing) {
    queued = true;
    return;
  }
  syncing = true;
  setStatus({ state: "syncing", error: null });
  try {
    await adoptServerIfCleanDevice();
    for (const t of SYNCED_TABLES) await pushTable(t);
    for (const t of SYNCED_TABLES) await pullTable(t);
    await setMeta("lastSync", new Date().toISOString());
    setStatus({ state: "idle", lastSync: new Date().toISOString() });
  } catch (e) {
    setStatus({ state: "error", error: e instanceof Error ? e.message : String(e) });
  } finally {
    syncing = false;
    await refreshPending();
    if (queued) {
      queued = false;
      void syncNow();
    }
  }
}

// ---------- triggers ----------

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleSync(delayMs = 4000): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void syncNow();
  }, delayMs);
  void refreshPending();
}

export function startSyncTriggers(): void {
  window.addEventListener("online", () => void syncNow());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") scheduleSync(800);
  });
  void getMeta("lastSync").then((v) => setStatus({ lastSync: v }));
  void syncNow();
}

// Wipe pull cursors (used after sign-out/sign-in as a different flow).
export async function resetCursors(): Promise<void> {
  for (const t of SYNCED_TABLES) await db.meta.delete(`pull:${t}`);
  await db.meta.delete("lastSync");
}
