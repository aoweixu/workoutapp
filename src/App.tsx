import { useEffect, useState, useSyncExternalStore } from "react";
import { getSettings, saveSettings, DEFAULT_SETTINGS, type Settings } from "./db/repo";
import { getSyncStatus, subscribeSync } from "./sync/engine";
import { setTimerSound } from "./state/timer";
import { useWakeLock } from "./hooks/useWakeLock";
import { TodayView } from "./ui/TodayView";
import { HistoryView } from "./ui/HistoryView";
import { ProgressView } from "./ui/ProgressView";
import { PlanView } from "./ui/PlanView";
import { SettingsView } from "./ui/SettingsView";
import { RestTimerPill } from "./ui/RestTimer";
import { ToastHost } from "./ui/Toast";
import {
  IconBarbell,
  IconChart,
  IconGear,
  IconHistory,
  IconPlan,
} from "./ui/Icons";

type Tab = "today" | "history" | "progress" | "plan" | "settings";

const TABS: { id: Tab; label: string; icon: typeof IconBarbell }[] = [
  { id: "today", label: "Today", icon: IconBarbell },
  { id: "history", label: "History", icon: IconHistory },
  { id: "progress", label: "Progress", icon: IconChart },
  { id: "plan", label: "Plan", icon: IconPlan },
  { id: "settings", label: "Sync", icon: IconGear },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("today");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const sync = useSyncExternalStore(subscribeSync, getSyncStatus);

  useEffect(() => {
    void getSettings().then((s) => {
      setSettings(s);
      setTimerSound(s.sound);
    });
  }, []);

  const patchSettings = (patch: Partial<Settings>) => {
    setSettings((cur) => {
      const next = { ...cur, ...patch };
      void saveSettings(next);
      setTimerSound(next.sound);
      return next;
    });
  };

  useWakeLock(settings.wakeLock && tab === "today");

  const dot =
    sync.state === "error"
      ? "bg-bad"
      : sync.state === "syncing"
        ? "bg-steel animate-pulse"
        : sync.pending > 0
          ? "bg-gold"
          : sync.state === "idle"
            ? "bg-good"
            : "";

  return (
    <div className="min-h-dvh max-w-[640px] mx-auto pb-[92px]">
      {tab === "today" ? <TodayView settings={settings} /> : null}
      {tab === "history" ? <HistoryView /> : null}
      {tab === "progress" ? <ProgressView /> : null}
      {tab === "plan" ? <PlanView /> : null}
      {tab === "settings" ? (
        <SettingsView settings={settings} onSettings={patchSettings} />
      ) : null}

      <RestTimerPill />
      <ToastHost />

      <nav className="tabbar">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              className={`tab ${tab === t.id ? "tab-active" : ""}`}
              onClick={() => setTab(t.id)}
              aria-label={t.label}
              aria-current={tab === t.id ? "page" : undefined}
            >
              <span className="relative">
                <Icon size={22} />
                {t.id === "settings" && dot ? (
                  <span className={`absolute -top-0.5 -right-1 w-2 h-2 rounded-full ${dot}`} />
                ) : null}
              </span>
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
