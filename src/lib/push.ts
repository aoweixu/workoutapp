import { getClient } from "../sync/client";
import type { RestState } from "../state/timer";

// Server-side rest push. Android freezes a backgrounded PWA within seconds,
// so the page can't be trusted to fire the rest-done notification itself
// (lib/notify.ts still covers the app-alive case). Instead every set log
// tells the rest-timer edge function when the rest ends; it sends a real web
// push through FCM at that moment, which wakes the phone even if the app's
// process is frozen or gone. Requires: signed in to sync, notification
// permission granted. All calls are fire-and-forget — offline or signed-out
// just degrades back to the local path.

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function pushReady(): boolean {
  return (
    !!VAPID_PUBLIC_KEY &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    Notification.permission === "granted"
  );
}

async function getSubscription(): Promise<PushSubscriptionJSON | null> {
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      // base64url string is accepted directly (spec: BufferSource or DOMString)
      applicationServerKey: VAPID_PUBLIC_KEY,
    }));
  return sub.toJSON();
}

export function schedulePush(rest: RestState): void {
  if (!pushReady()) return;
  void (async () => {
    const c = getClient();
    if (!c) return;
    const { data } = await c.auth.getSession();
    if (!data.session) return;
    const sub = await getSubscription();
    if (!sub?.endpoint) return;
    await c.functions.invoke("rest-timer", {
      body: {
        action: "schedule",
        endsAt: new Date(rest.endsAt).toISOString(),
        exercise: rest.exerciseName,
        setNo: rest.setNo,
        subscription: sub,
      },
    });
  })().catch(() => {});
}

export function cancelPush(): void {
  if (!pushReady()) return;
  void (async () => {
    const c = getClient();
    if (!c) return;
    const { data } = await c.auth.getSession();
    if (!data.session) return;
    await c.functions.invoke("rest-timer", { body: { action: "cancel" } });
  })().catch(() => {});
}
