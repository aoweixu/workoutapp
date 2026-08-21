// Rest-done notification. Fired from the page (no push server), so it only
// works while the page is alive — foreground, popped-out in PiP, or recently
// backgrounded. On a watch paired to the phone the notification mirrors to
// the wrist. Only shown when the app is hidden: in the foreground the
// vibration + beep already cover it.

const TAG = "rest-done";
const ASKED_KEY = "overload.notifyAsked";

export function notificationsSupported(): boolean {
  return "Notification" in window && "serviceWorker" in navigator;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  return notificationsSupported() ? Notification.permission : "unsupported";
}

// One-shot auto-prompt from the first set-log tap (a user gesture). Repeat
// prompting after a dismissal gets the origin auto-blocked, so further asks
// only happen explicitly from Settings.
export function maybeAskNotificationPermission(): void {
  if (!notificationsSupported()) return;
  if (Notification.permission !== "default") return;
  if (localStorage.getItem(ASKED_KEY)) return;
  localStorage.setItem(ASKED_KEY, "1");
  void Notification.requestPermission();
}

export async function askNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!notificationsSupported()) return "unsupported";
  localStorage.setItem(ASKED_KEY, "1");
  return Notification.requestPermission();
}

export function notifyRestDone(exerciseName: string, setNo: number): void {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return;
  void navigator.serviceWorker.ready.then((reg) =>
    reg.showNotification("Rest done — go", {
      body: `${exerciseName} · set ${setNo}`,
      tag: TAG,
      icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
      badge: `${import.meta.env.BASE_URL}icons/icon-192.png`,
    }),
  );
}

// Drop a lingering rest-done card once it is stale (next set logged, or the
// user is back in the app looking at the screen).
export function clearRestDoneNotification(): void {
  if (!notificationsSupported()) return;
  void navigator.serviceWorker.ready.then(async (reg) => {
    const open = await reg.getNotifications({ tag: TAG });
    open.forEach((n) => n.close());
  });
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") clearRestDoneNotification();
  });
}
