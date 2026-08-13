import { useEffect, useState, useSyncExternalStore } from "react";
import { db } from "../db/db";
import { exportJson, importJson, type Settings } from "../db/repo";
import { clearConfig, getClient, getConfig, saveConfig } from "../sync/client";
import {
  getSyncStatus,
  resetCursors,
  scheduleSync,
  subscribeSync,
  syncNow,
} from "../sync/engine";
import { showToast } from "../state/ui";

export function SettingsView(props: {
  settings: Settings;
  onSettings: (patch: Partial<Settings>) => void;
}) {
  return (
    <div className="px-4 pt-5 space-y-3">
      <div className="eyebrow">Sync, preferences, data</div>
      <h1 className="display text-[40px] font-bold leading-[1.05] !mt-0.5 mb-1">Settings</h1>
      <SyncCard />
      <PrefsCard settings={props.settings} onSettings={props.onSettings} />
      <BackupCard />
      <div className="text-[12.5px] text-faint px-1 pb-4">
        Overload · personal workout log. Install: Chrome menu → Add to home screen.
      </div>
    </div>
  );
}

const STATE_LABEL: Record<string, string> = {
  off: "Not connected",
  signedOut: "Signed out",
  offline: "Offline — will sync when back online",
  syncing: "Syncing…",
  idle: "Synced",
  error: "Sync error",
};

function SyncCard() {
  const status = useSyncExternalStore(subscribeSync, getSyncStatus);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState(false);
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const cfg = getConfig();

  useEffect(() => {
    const c = getClient();
    if (!c) return;
    void c.auth.getSession().then(({ data }) => setUserEmail(data.session?.user.email ?? null));
    const { data: sub } = c.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [cfg?.url]);

  const signIn = async (create: boolean) => {
    const c = getClient();
    if (!c) return;
    setBusy(true);
    try {
      if (create) {
        const { error } = await c.auth.signUp({ email, password });
        if (error) throw error;
        showToast("Account created. Confirm via the email you just got, then sign in.");
      } else {
        const { error } = await c.auth.signInWithPassword({ email, password });
        if (error) throw error;
        showToast("Signed in");
        await syncNow();
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await getClient()?.auth.signOut();
    showToast("Signed out. Data stays on this phone.");
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="text-[16px] font-semibold">Cloud sync</div>
        <span
          className={`text-[13px] ${
            status.state === "error"
              ? "text-bad"
              : status.state === "idle"
                ? "text-good"
                : "text-dim"
          }`}
        >
          {STATE_LABEL[status.state]}
        </span>
      </div>
      {status.error ? (
        <div className="text-[13px] text-bad mt-1 break-words">{status.error}</div>
      ) : null}
      <div className="text-[13px] text-dim mt-1">
        {status.pending > 0 ? `${status.pending} change${status.pending === 1 ? "" : "s"} waiting · ` : ""}
        {status.lastSync ? `last sync ${new Date(status.lastSync).toLocaleString()}` : "never synced"}
      </div>

      {!cfg || editingConfig ? (
        <div className="mt-3 space-y-2">
          <div className="text-[13.5px] text-dim">
            Paste your Supabase project URL and anon key (Project Settings → API).
          </div>
          <input
            className="input"
            placeholder="https://xxxx.supabase.co"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoCapitalize="none"
          />
          <input
            className="input"
            placeholder="anon public key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            autoCapitalize="none"
          />
          <button
            className="btn btn-primary w-full"
            onClick={() => {
              if (!url.trim() || !key.trim()) return;
              saveConfig(url, key);
              setEditingConfig(false);
              showToast("Supabase connected");
              void syncNow();
            }}
          >
            Connect
          </button>
        </div>
      ) : userEmail ? (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 text-[14px] truncate">{userEmail}</div>
          <button className="btn px-3 py-1.5 text-[13px]" onClick={() => void syncNow()}>
            Sync now
          </button>
          <button className="btn btn-quiet px-2 py-1.5 text-[13px]" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <input
            className="input"
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoCapitalize="none"
          />
          <input
            className="input"
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1" disabled={busy} onClick={() => void signIn(false)}>
              Sign in
            </button>
            <button className="btn flex-1" disabled={busy} onClick={() => void signIn(true)}>
              Create account
            </button>
          </div>
        </div>
      )}

      {cfg && !editingConfig ? (
        <button
          className="text-[12.5px] text-faint mt-3"
          onClick={() => {
            setUrl(cfg.url);
            setKey(cfg.key);
            setEditingConfig(true);
          }}
        >
          {new URL(cfg.url).host} · change
        </button>
      ) : cfg && editingConfig ? (
        <button
          className="text-[12.5px] text-bad mt-3"
          onClick={() => {
            if (confirm("Disconnect Supabase? Local data stays.")) {
              clearConfig();
              void resetCursors();
              setEditingConfig(false);
            }
          }}
        >
          Disconnect
        </button>
      ) : null}
    </div>
  );
}

function PrefsCard(props: {
  settings: Settings;
  onSettings: (patch: Partial<Settings>) => void;
}) {
  const s = props.settings;
  return (
    <div className="card p-4 space-y-3">
      <div className="text-[16px] font-semibold">Workout</div>
      <label className="flex items-center justify-between gap-3">
        <span className="text-[15px]">Default rest timer</span>
        <div className="flex items-center gap-1.5">
          <input
            className="input !w-[76px] text-center"
            type="number"
            min={0}
            value={s.restDefault}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              props.onSettings({ restDefault: Number.isFinite(v) ? Math.max(0, v) : 0 });
            }}
          />
          <span className="text-dim text-[14px]">s</span>
        </div>
      </label>
      <ToggleRow
        label="Timer sound"
        checked={s.sound}
        onChange={(v) => props.onSettings({ sound: v })}
      />
      <ToggleRow
        label="Keep screen on during workout"
        checked={s.wakeLock}
        onChange={(v) => props.onSettings({ wakeLock: v })}
      />
    </div>
  );
}

function ToggleRow(props: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
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

function BackupCard() {
  const doExport = async () => {
    const json = await exportJson();
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `overload-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const doImport = (file: File | undefined) => {
    if (!file) return;
    void file.text().then(async (text) => {
      try {
        await importJson(text);
        showToast("Backup restored");
        scheduleSync();
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Import failed");
      }
    });
  };

  const doReset = async () => {
    if (!confirm("Erase ALL local data on this device? A synced copy (if any) stays in Supabase.")) return;
    await db.delete();
    location.reload();
  };

  return (
    <div className="card p-4 space-y-2.5">
      <div className="text-[16px] font-semibold">Data</div>
      <button className="btn w-full" onClick={() => void doExport()}>
        Export backup (JSON)
      </button>
      <label className="btn w-full cursor-pointer">
        Import backup
        <input
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => doImport(e.target.files?.[0])}
        />
      </label>
      <button className="btn btn-danger w-full" onClick={() => void doReset()}>
        Erase local data
      </button>
    </div>
  );
}
